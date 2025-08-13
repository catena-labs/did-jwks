import { OpenIDConfigurationSchema } from "./utils/schemas"
import type { Did, JsonWebKeySet } from "web-identity-schemas"
import { JsonWebKeySetSchema } from "web-identity-schemas/valibot"
import { fetchWithSchema } from "./utils/fetch-with-schema"
import { createDidJwksDidDocument } from "./did-jwks"

const jwksUrl = (base: string) => `${base}/.well-known/jwks.json`
const openidConfigurationUrl = (base: string) =>
  `${base}/.well-known/openid-configuration`

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

  let jwks = await fetchWithSchema(
    jwksUrl(base),
    JsonWebKeySetSchema,
    opts.fetch
  )

  if (jwks) {
    return jwks
  }

  // If that fails, try OpenID configuration
  const openidConfig = await fetchWithSchema(
    openidConfigurationUrl(base),
    OpenIDConfigurationSchema,
    opts.fetch
  )
  if (!openidConfig?.jwks_uri) {
    return null
  }

  jwks = await fetchWithSchema(
    openidConfig.jwks_uri,
    JsonWebKeySetSchema,
    opts.fetch
  )

  return jwks
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
 * Build a base path from a full `did:jwks` URI.
 *
 * @example
 * ```
 * const base = buildBasePath("did:jwks:accounts.google.com:matt");
 * // base === "accounts.google.com/matt"
 * ```
 *
 * @returns The base path
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

  const protocol = getProtocol(basePath, allowedHttpHosts)
  return `${protocol}://${basePath}`
}

function getProtocol(
  path: string,
  allowedHttpHosts: string[] = []
): "http" | "https" {
  const [host] = path.split("/")

  if (host) {
    const [hostWithoutPort] = host.split(":")
    return allowedHttpHosts.some((host) => host === hostWithoutPort)
      ? "http"
      : "https"
  }

  return "https"
}
