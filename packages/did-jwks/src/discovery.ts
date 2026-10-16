import { fetchWithSchema } from "./utils/fetch-with-schema"
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

function isSecureUrl(
  value: string,
  allowedHttpHosts: readonly string[]
): boolean {
  const url = new URL(value)
  return (
    url.protocol === "https:" ||
    (url.protocol === "http:" && allowedHttpHosts.includes(url.hostname))
  )
}

/**
 * Discover the JWKS location for an identity through its OAuth 2.0 / OpenID
 * Connect discovery document.
 *
 * The document's `issuer` must exactly equal the identity URL, and its
 * `jwks_uri` must use `https`. The `jwks_uri` may be on a different origin.
 *
 * @returns The `jwks_uri`, or `null` if the document is missing, malformed
 * or fails a check.
 */
export async function discoverJwksUri(
  identityUrl: string,
  opts: DiscoverJwksUriOptions = {}
): Promise<string | null> {
  const config = await fetchWithSchema(
    buildDiscoveryUrl(identityUrl),
    OpenIDConfigurationSchema,
    opts.fetch
  )

  if (!config || config.issuer !== identityUrl) {
    return null
  }

  return isSecureUrl(config.jwks_uri, opts.allowedHttpHosts ?? [])
    ? config.jwks_uri
    : null
}
