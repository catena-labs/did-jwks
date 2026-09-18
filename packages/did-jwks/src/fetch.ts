import type { Did, JsonWebKeySet } from "web-identity-schemas"
import { JsonWebKeySetSchema } from "web-identity-schemas/valibot"

import { createDidJwksDidDocument } from "./did-jwks"
import { fetchWithSchema } from "./utils/fetch-with-schema"
import { OpenIDConfigurationSchema } from "./utils/schemas"

interface ResolutionUrls {
  readonly jwks: string
  readonly openidConfiguration: string
}

/**
 * Build JWKS and OIDC discovery URLs based on whether the DID contains a path.
 *
 * Root DIDs use `.well-known` exclusively (RFC 8615 compliant).
 * Path DIDs use direct file paths for JWKS and RFC 8414-style discovery
 * where `.well-known/openid-configuration` is inserted between the origin and path.
 */
function buildResolutionUrls(base: string): ResolutionUrls {
  const url = new URL(base)
  const hasPath = url.pathname !== "/" && url.pathname !== ""

  if (hasPath) {
    const path = url.pathname.replace(/^\/+|\/+$/g, "")
    return {
      jwks: `${base}/jwks.json`,
      openidConfiguration: `${url.origin}/.well-known/openid-configuration/${path}`
    }
  }

  return {
    jwks: `${base}/.well-known/jwks.json`,
    openidConfiguration: `${base}/.well-known/openid-configuration`
  }
}

export interface FetchJwksOptions {
  /**
   * The fetch function to use.
   *
   * @default globalThis.fetch
   */
  fetch?: typeof globalThis.fetch
  /**
   * The hosts that are allowed to be used via `http`. All other hosts will
   * require `https`.  This is useful for local development and testing.
   *
   * @default []
   */
  allowedHttpHosts?: string[]
}

export async function fetchJwks(
  did: Did<"jwks">,
  opts: FetchJwksOptions = {}
): Promise<JsonWebKeySet | null> {
  const base = buildBaseUrl(did, opts.allowedHttpHosts)
  const urls = buildResolutionUrls(base)

  const jwks = await fetchWithSchema(urls.jwks, JsonWebKeySetSchema, opts.fetch)
  if (jwks) {
    return jwks
  }

  // If JWKS fetch fails, try OpenID configuration discovery
  const openidConfig = await fetchWithSchema(
    urls.openidConfiguration,
    OpenIDConfigurationSchema,
    opts.fetch
  )
  if (openidConfig?.jwks_uri) {
    return await fetchWithSchema(
      openidConfig.jwks_uri,
      JsonWebKeySetSchema,
      opts.fetch
    )
  }

  return null
}

/**
 * Fetches the DID document for a given DID with the "jwks" method.
 *
 * @param did - The DID to fetch the document for.
 * @param opts - The options for the fetch.
 * @returns The DID document or `null` if the document could not be fetched.
 */
export async function fetchJwksDidDocument(
  did: Did<"jwks">,
  opts: FetchJwksOptions = {}
) {
  const jwks = await fetchJwks(did, opts)
  if (!jwks) {
    return null
  }

  return await createDidJwksDidDocument(did, jwks)
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
function buildBaseUrl(
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
