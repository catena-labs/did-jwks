import type { Did, JsonWebKeySet } from "web-identity-schemas"
import { JsonWebKeySetSchema } from "web-identity-schemas/valibot"

import { createDidJwksDidDocument } from "./did-jwks"
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
}

/**
 * Fetches the JWKS for a `did:jwks` DID from its fixed location.
 *
 * Resolution reads exactly one location. A 404, an error status or a
 * malformed document returns `null`, and a network error rejects. There is
 * no fallback to another location.
 */
export async function fetchJwks(
  did: Did<"jwks">,
  opts: FetchJwksOptions = {}
): Promise<JsonWebKeySet | null> {
  const base = buildBaseUrl(did, opts.allowedHttpHosts)
  return await fetchWithSchema(
    buildJwksUrl(base),
    JsonWebKeySetSchema,
    opts.fetch
  )
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
