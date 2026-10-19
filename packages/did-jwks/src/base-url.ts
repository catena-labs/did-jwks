import type { Did } from "web-identity-schemas"

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
    throw new Error(`Invalid did:jwks authority: ${JSON.stringify(authority)}`)
  }

  const colonIndex = authority.indexOf(":")
  const hostname =
    colonIndex === -1 ? authority : authority.slice(0, colonIndex)
  const port = colonIndex === -1 ? null : authority.slice(colonIndex + 1)
  const isAllowed = allowedHttpHosts.includes(hostname)

  if (!isValidDomainName(hostname) && !isAllowed) {
    throw new Error(`Invalid did:jwks authority: ${JSON.stringify(authority)}`)
  }

  if (port === null) {
    return { authority: hostname, protocol: isAllowed ? "http" : "https" }
  }

  if (!/^\d+$/.test(port) || !isAllowed) {
    throw new Error(`Invalid did:jwks authority: ${JSON.stringify(authority)}`)
  }
  return { authority: `${hostname}:${port}`, protocol: "http" }
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
    decodeURIComponent(rawAuthority),
    allowedHttpHosts
  )

  // Decode each path segment, then re-encode it, rather than splicing the
  // decoded value directly into the URL string: this is what stops a
  // segment from smuggling in `/`, `?`, `#`, or other URL-structural
  // characters to reshape the request.
  const path = rawPathSegments
    .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
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
    throw new Error(
      `Invalid did:jwks authority: ${JSON.stringify(rawAuthority)}`
    )
  }

  return base
}
