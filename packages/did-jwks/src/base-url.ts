import type { Did } from "web-identity-schemas"

/**
 * Thrown when a `did:jwks` DID does not name a valid resolution URL.
 */
export class InvalidDidError extends Error {
  override readonly name = "InvalidDidError"
}

const MAX_PORT = 65_535
const DEFAULT_HTTP_PORT = 80

function isValidHostnameLabel(label: string): boolean {
  return (
    label.length > 0 &&
    label.length <= 63 &&
    /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label)
  )
}

/**
 * A conservative check for SPEC.md's `domain-name = DNS domain name`
 * grammar: a dot-separated sequence of hostname labels, nothing else.
 *
 * Rejects dotted-decimal IPv4 literals like `169.254.169.254` by requiring
 * the rightmost label to not be all-digits (a DNS domain name's TLD never
 * is). Other IPv4 forms, such as `0x7f.0.0.0x1`, pass this check, and the
 * URL check in `buildBaseUrl` rejects them.
 */
function isValidDomainName(hostname: string): boolean {
  if (hostname.length === 0 || hostname.length > 253) {
    return false
  }
  const labels = hostname.split(".")
  const lastLabel = labels.at(-1)
  if (lastLabel !== undefined && /^\d+$/.test(lastLabel)) {
    return false
  }
  return labels.every(isValidHostnameLabel)
}

function parsePort(port: string): number | null {
  if (!/^\d+$/.test(port)) {
    return null
  }
  const value = Number(port)
  return value >= 1 && value <= MAX_PORT ? value : null
}

function invalidAuthority(authority: string): InvalidDidError {
  return new InvalidDidError(
    `Invalid did:jwks authority: ${JSON.stringify(authority)}`
  )
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    throw new InvalidDidError(
      `Invalid percent-encoding in did:jwks segment: ${JSON.stringify(segment)}`
    )
  }
}

/**
 * Validate a decoded `did:jwks` authority segment and resolve it to the
 * exact host (with an optional port) and protocol to connect to.
 *
 * The DID's security model depends on this segment being exactly the host
 * that gets queried, so this rejects anything that could let a crafted DID
 * redirect resolution to a host other than the one it appears to name:
 * userinfo (`@`), path/query/fragment markers (`/`, `?`, `#`), IP literals,
 * and ports outside of `allowedHttpHosts` (used for local development).
 * The hostname is lowercased, so the identity URL matches a lowercase issuer.
 * `allowedHttpHosts` entries must be lowercase.
 */
function validateAuthority(
  authority: string,
  allowedHttpHosts: string[]
): { authority: string; protocol: "http" | "https" } {
  if (/[@/?#]/.test(authority)) {
    throw invalidAuthority(authority)
  }

  const colonIndex = authority.indexOf(":")
  const hostname = (
    colonIndex === -1 ? authority : authority.slice(0, colonIndex)
  ).toLowerCase()
  const port = colonIndex === -1 ? null : authority.slice(colonIndex + 1)
  const isAllowed = allowedHttpHosts.includes(hostname)

  if (!isValidDomainName(hostname) && !isAllowed) {
    throw invalidAuthority(authority)
  }

  if (port === null) {
    return { authority: hostname, protocol: isAllowed ? "http" : "https" }
  }

  const portNumber = parsePort(port)
  if (portNumber === null || !isAllowed) {
    throw invalidAuthority(authority)
  }
  return portNumber === DEFAULT_HTTP_PORT
    ? { authority: hostname, protocol: "http" }
    : { authority: `${hostname}:${portNumber}`, protocol: "http" }
}

/**
 * Characters outside RFC 3986 `pchar`. A decoded segment encodes these again,
 * so it stays one URL path segment: the URL parser cannot split it at `/`,
 * `?`, `#`, or `\`, or delete a tab or newline from it. `@`, `:`, and the
 * sub-delimiters keep their decoded form.
 */
const NON_PCHAR = /[^A-Za-z0-9\-._~!$&'()*+,;=:@]/gu

/**
 * Decode a path segment and encode its non-`pchar` characters again. Empty
 * and dot segments are rejected: URL handling merges or removes them, which
 * would let one DID resolve another DID's path. A lone surrogate is rejected
 * because it has no UTF-8 encoding.
 */
function encodePathSegment(segment: string): string {
  const decoded = decodeSegment(segment)
  if (
    decoded === "" ||
    decoded === "." ||
    decoded === ".." ||
    !decoded.isWellFormed()
  ) {
    throw new InvalidDidError(
      `Invalid did:jwks path segment: ${JSON.stringify(segment)}`
    )
  }
  return decoded.replace(NON_PCHAR, encodeURIComponent)
}

/**
 * Build a base URL from a full `did:jwks` URI.
 *
 * @example
 * ```
 * const base = buildBaseUrl("did:jwks:accounts.google.com:matt");
 * // base === "https://accounts.google.com/matt"
 * ```
 *
 * @throws {InvalidDidError} If the DID does not name a valid resolution URL.
 * @returns The base URL
 */
export function buildBaseUrl(
  did: Did<"jwks">,
  allowedHttpHosts: string[] = []
): string {
  const [rawAuthority = "", ...rawPathSegments] = did
    .replace(/^did:jwks:/, "")
    .split(":")

  const { authority, protocol } = validateAuthority(
    decodeSegment(rawAuthority),
    allowedHttpHosts
  )

  const path = rawPathSegments.map(encodePathSegment).join("/")

  const base = `${protocol}://${authority}${path ? `/${path}` : ""}`

  // Defense in depth: rebuild through the URL parser and confirm it
  // resolved to exactly the validated authority, with no credentials
  // smuggled in through some encoding this function didn't anticipate.
  if (!URL.canParse(base)) {
    throw invalidAuthority(rawAuthority)
  }
  const url = new URL(base)
  if (url.username !== "" || url.password !== "" || url.host !== authority) {
    throw invalidAuthority(rawAuthority)
  }

  return base
}
