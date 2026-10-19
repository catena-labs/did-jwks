import type { Did, JsonWebKeySet } from "web-identity-schemas"
import { JsonWebKeySetSchema } from "web-identity-schemas/valibot"

import { buildBaseUrl } from "./base-url"
import { createDidJwksDidDocument } from "./did-jwks"
import { discoverJwksUri } from "./discovery"
import { fetchWithSchema } from "./utils/fetch-with-schema"

/**
 * Build the fallback JWKS location for a `did:jwks` base URL.
 *
 * Root DIDs use `.well-known` exclusively (RFC 8615 compliant).
 * Path DIDs use a direct file path below the DID path.
 */
function buildJwksUrl(base: string): string {
  const url = new URL(base)
  const hasPath = url.pathname !== "/" && url.pathname !== ""

  return hasPath ? `${base}/jwks.json` : `${base}/.well-known/jwks.json`
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
  /**
   * Read the fallback `jwks.json` location when the discovery document
   * returns 404.
   *
   * Set to `false` for discovery-only resolution: a DID with no discovery
   * document then fails to resolve. A valid discovery document always wins,
   * and no other discovery failure falls back, whatever this setting is.
   *
   * @default true
   */
  jwksFallback?: boolean
}

/**
 * Select the one location to read keys from.
 *
 * A valid discovery document makes its `jwks_uri` the only key location. Only
 * a discovery 404 selects the fallback `jwks.json` location. Every other
 * discovery failure selects no location.
 */
async function selectJwksUrl(
  base: string,
  opts: FetchJwksOptions
): Promise<string | null> {
  const discovery = await discoverJwksUri(base, opts)

  switch (discovery.status) {
    case "found":
      return discovery.value
    case "missing":
      return (opts.jwksFallback ?? true) ? buildJwksUrl(base) : null
    case "invalid":
      return null
  }
}

/**
 * Fetches the JWKS for a `did:jwks` DID from exactly one location.
 *
 * Discovery comes first. If the discovery document is valid, its `jwks_uri`
 * is the only key location. If the discovery document returns 404, the
 * fallback `jwks.json` location is the only key location, unless
 * `opts.jwksFallback` is `false`. An empty key set counts as malformed. A
 * failure at the selected location returns `null` and never moves to another
 * location. A network error rejects. A DID that does not name a valid
 * resolution URL rejects with `InvalidDidError`.
 */
export async function fetchJwks(
  did: Did<"jwks">,
  rawOpts: FetchJwksOptions = {}
): Promise<JsonWebKeySet | null> {
  const opts = {
    ...rawOpts,
    allowedHttpHosts: rawOpts.allowedHttpHosts?.map((host) =>
      host.toLowerCase()
    )
  }
  const base = buildBaseUrl(did, opts.allowedHttpHosts)
  const jwksUrl = await selectJwksUrl(base, opts)
  if (!jwksUrl) {
    return null
  }

  const jwks = await fetchWithSchema(
    jwksUrl,
    JsonWebKeySetSchema,
    opts.fetch,
    opts.allowedHttpHosts
  )
  return jwks.status === "found" && jwks.value.keys.length > 0
    ? jwks.value
    : null
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
