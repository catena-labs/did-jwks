import type { Did } from "web-identity-schemas"

/**
 * Thrown when a `did:jwks` DID does not name a valid resolution URL.
 */
export class InvalidDidError extends Error {
  override readonly name = "InvalidDidError"
}

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
 * Rejects IP literals by requiring the rightmost label to not be all-digits
 * (a DNS domain name's TLD never is) - this also covers IPv4 dotted-quad
 * addresses like `169.254.169.254`.
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
 */
function validateAuthority(
  authority: string,
  allowedHttpHosts: string[]
): { authority: string; protocol: "http" | "https" } {
  if (/[@/?#]/.test(authority)) {
    throw invalidAuthority(authority)
  }

  const colonIndex = authority.indexOf(":")
  const hostname =
    colonIndex === -1 ? authority : authority.slice(0, colonIndex)
  const port = colonIndex === -1 ? null : authority.slice(colonIndex + 1)
  const isAllowed = allowedHttpHosts.includes(hostname)

  if (!isValidDomainName(hostname) && !isAllowed) {
    throw invalidAuthority(authority)
  }

  if (port === null) {
    return { authority: hostname, protocol: isAllowed ? "http" : "https" }
  }

  if (!/^\d+$/.test(port) || !isAllowed) {
    throw invalidAuthority(authority)
  }
  return { authority: `${hostname}:${port}`, protocol: "http" }
}

/**
 * Decode a path segment and re-encode it, so a decoded `/`, `?`, or `#`
 * stays inside its own segment. Dot segments are rejected: URL parsing
 * removes them, which would let one DID resolve another DID's path.
 */
function encodePathSegment(segment: string): string {
  const decoded = decodeSegment(segment)
  if (decoded === "." || decoded === "..") {
    throw new InvalidDidError(
      `Invalid did:jwks path segment: ${JSON.stringify(segment)}`
    )
  }
  return encodeURIComponent(decoded)
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

  const path = rawPathSegments
    .map(encodePathSegment)
    .join("/")
    .replace(/\/+$/, "") // Strip trailing slashes in case of trailing colons

  const base = `${protocol}://${authority}${path ? `/${path}` : ""}`

  // Defense in depth: rebuild through the URL parser and confirm it
  // resolved to exactly the validated authority, with no credentials
  // smuggled in through some encoding this function didn't anticipate.
  const url = new URL(base)
  if (
    url.username !== "" ||
    url.password !== "" ||
    url.host !== authority.toLowerCase()
  ) {
    throw invalidAuthority(rawAuthority)
  }

  return base
}
