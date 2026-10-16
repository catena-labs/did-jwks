import type { Did, JsonWebKeySet } from "web-identity-schemas"
import { JsonWebKeySetSchema } from "web-identity-schemas/valibot"

import { createDidJwksDidDocument } from "./did-jwks"
import { discoverJwksUri } from "./discovery"
import { fetchWithSchema } from "./utils/fetch-with-schema"

/**
 * Build the fixed JWKS location for a `did:jwks` base URL.
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
   * The DIDs that resolve through OAuth 2.0 / OpenID Connect discovery
   * instead of the fixed JWKS location.
   *
   * For a listed DID, the resolver reads the discovery document, checks that
   * its `issuer` exactly equals the DID's URL, and reads keys only from its
   * `jwks_uri`. The fixed location is never read for that DID. All other DIDs
   * read only the fixed location. A miss at either location never falls back
   * to the other.
   *
   * DIDs are compared as exact strings.
   *
   * @default []
   */
  discoveryDids?: readonly Did<"jwks">[]
}

/**
 * Fetches the JWKS for a `did:jwks` DID from exactly one location.
 *
 * The location is the fixed JWKS path, or the discovered `jwks_uri` when the
 * DID is listed in `opts.discoveryDids`. A 404, an error status or a
 * malformed document returns `null`, and a network error rejects. There is
 * no fallback to another location.
 */
export async function fetchJwks(
  did: Did<"jwks">,
  opts: FetchJwksOptions = {}
): Promise<JsonWebKeySet | null> {
  const base = buildBaseUrl(did, opts.allowedHttpHosts)
  const jwksUrl = opts.discoveryDids?.includes(did)
    ? await discoverJwksUri(base, opts)
    : buildJwksUrl(base)

  if (!jwksUrl) {
    return null
  }

  return await fetchWithSchema(jwksUrl, JsonWebKeySetSchema, opts.fetch)
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
