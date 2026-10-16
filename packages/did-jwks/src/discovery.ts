import { fetchWithSchema } from "./utils/fetch-with-schema"
import type { FetchResult } from "./utils/fetch-with-schema"
import { OpenIDConfigurationSchema } from "./utils/schemas"

interface DiscoverJwksUriOptions {
  readonly fetch?: typeof globalThis.fetch
  readonly allowedHttpHosts?: readonly string[]
}

/**
 * Build the discovery document URL for an identity URL.
 *
 * Root identities use `/.well-known/openid-configuration`. Path identities use
 * the RFC 8414 insertion form, where `.well-known/openid-configuration` is
 * inserted between the origin and the path. The OIDC path-append form is
 * never read.
 */
function buildDiscoveryUrl(identityUrl: string): string {
  const url = new URL(identityUrl)
  const path = url.pathname.replace(/^\/+|\/+$/g, "")

  return path
    ? `${url.origin}/.well-known/openid-configuration/${path}`
    : `${url.origin}/.well-known/openid-configuration`
}

/**
 * The issuer must equal the identity URL. RFC 8414 section 3.1 removes one
 * terminating "/" from the issuer before it builds the discovery URL, so an
 * issuer with one terminating "/" names the same identity.
 */
function isMatchingIssuer(issuer: string, identityUrl: string): boolean {
  return issuer === identityUrl || issuer === `${identityUrl}/`
}

/**
 * A `jwks_uri` must use `https`. The only exception is local testing: an
 * `http` identity URL may name an `http` `jwks_uri` on an allowed http host.
 */
function isAllowedJwksUri(
  jwksUri: string,
  identityUrl: string,
  allowedHttpHosts: readonly string[]
): boolean {
  const url = new URL(jwksUri)
  if (url.protocol === "https:") {
    return true
  }

  return (
    url.protocol === "http:" &&
    new URL(identityUrl).protocol === "http:" &&
    allowedHttpHosts.includes(url.hostname)
  )
}

/**
 * Discover the JWKS location for an identity through its OAuth 2.0 / OpenID
 * Connect discovery document.
 *
 * @returns `found` with the `jwks_uri`, `missing` if the discovery document
 * returns 404, or `invalid` if it returns a status that is not a success or
 * 404, fails to parse, or fails the `issuer` or `jwks_uri` check. A network
 * error rejects.
 */
export async function discoverJwksUri(
  identityUrl: string,
  opts: DiscoverJwksUriOptions = {}
): Promise<FetchResult<string>> {
  const result = await fetchWithSchema(
    buildDiscoveryUrl(identityUrl),
    OpenIDConfigurationSchema,
    opts.fetch
  )
  if (result.status !== "found") {
    return result
  }

  const { issuer, jwks_uri: jwksUri } = result.value
  const isValid =
    isMatchingIssuer(issuer, identityUrl) &&
    isAllowedJwksUri(jwksUri, identityUrl, opts.allowedHttpHosts ?? [])

  return isValid ? { status: "found", value: jwksUri } : { status: "invalid" }
}
