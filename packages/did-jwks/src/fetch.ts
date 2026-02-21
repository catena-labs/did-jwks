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
  const basePath = did
    .replace(/^did:jwks:/, "")
    .split(":")
    .map(decodeURIComponent)
    .join("/")
    .replace(/\/+$/, "") // Strip trailing slashes in case of trailing colons

  const protocol = getProtocol(basePath, allowedHttpHosts)
  return `${protocol}://${basePath}`
}

function getProtocol(
  path: string,
  allowedHttpHosts: string[] = []
): "http" | "https" {
  const [host] = path.split("/")

  if (host) {
    const hostWithoutPort = host.split(":")[0] ?? host
    return allowedHttpHosts.includes(hostWithoutPort) ? "http" : "https"
  }

  return "https"
}
