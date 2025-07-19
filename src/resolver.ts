import type { DIDResolutionResult, DIDResolver } from "did-resolver"
import { fetchJwks, type FetchJwksOptions } from "./fetch"
import { createDidDocument } from "./did-document"
import { isDidJwksUri, isDidUri } from "./did-jwks"

/**
 * Get a `did-resolver` compatible resolver for did:jwks
 * @see {@link https://www.w3.org/TR/did-resolution/}
 *
 * @param opts - Additional options for the resolver
 * @param opts.fetch - The fetch function to use.
 * @param opts.allowedHttpHosts - The hosts that are allowed to be used via
 * `http`. All other hosts will require `https`.  This is useful for local
 * development and testing.
 *
 * @returns A `did:jwks` resolver for use with `did-resolver`
 */
export function getResolver(opts: FetchJwksOptions = {}): {
  jwks: DIDResolver
} {
  async function resolve(did: string): Promise<DIDResolutionResult> {
    if (!isDidUri(did)) {
      return {
        didDocument: null,
        didDocumentMetadata: {},
        didResolutionMetadata: { error: "invalidDid" }
      }
    }

    if (!isDidJwksUri(did)) {
      return {
        didDocument: null,
        didDocumentMetadata: {},
        didResolutionMetadata: { error: "unsupportedDidMethod" }
      }
    }

    const jwks = await fetchJwks(did, opts)

    if (!jwks) {
      return {
        didDocument: null,
        didDocumentMetadata: {},
        didResolutionMetadata: { error: "notFound", message: "No JWKS found" }
      }
    }

    return {
      didDocument: createDidDocument(did, jwks),
      didDocumentMetadata: {},
      didResolutionMetadata: { contentType: "application/did+ld+json" }
    }
  }

  return {
    jwks: resolve
  }
}
