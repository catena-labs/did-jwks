import { isDidJwks, fetchJwksDidDocument, InvalidDidError } from "did-jwks"
import type { FetchJwksOptions } from "did-jwks"
import type { DIDResolutionResult, DIDResolver } from "did-resolver"

/**
 * Get a `did-resolver` compatible resolver for did:jwks
 * @see {@link https://www.w3.org/TR/did-resolution/}
 *
 * @param opts - Additional options for the resolver
 * @param opts.fetch - The fetch function to use.
 * @param opts.allowedHttpHosts - The hosts that may use `http` and a port.
 * All other hosts use `https` with no port. Entries match without regard to
 * case. An allowed host skips the DNS-name check, so it can be an IP address.
 * This is useful for local development and testing only.
 * @param opts.jwksFallback - Read `jwks.json` when the discovery document
 * returns 404. Set to `false` for discovery-only resolution. Defaults to
 * `true`.
 *
 * @returns A `did:jwks` resolver for use with `did-resolver`
 */
export function getResolver(opts: FetchJwksOptions = {}): {
  jwks: DIDResolver
} {
  async function resolve(did: string): Promise<DIDResolutionResult> {
    if (!did) {
      return {
        didDocument: null,
        didDocumentMetadata: {},
        didResolutionMetadata: { error: "invalidDid" }
      }
    }

    if (!isDidJwks(did)) {
      return {
        didDocument: null,
        didDocumentMetadata: {},
        didResolutionMetadata: { error: "unsupportedDidMethod" }
      }
    }

    let didDocument
    try {
      didDocument = await fetchJwksDidDocument(did, opts)
    } catch (e) {
      if (e instanceof InvalidDidError) {
        return {
          didDocument: null,
          didDocumentMetadata: {},
          didResolutionMetadata: { error: "invalidDid", message: e.message }
        }
      }

      return {
        didDocument: null,
        didDocumentMetadata: {},
        didResolutionMetadata: {
          error: "internalError",
          message:
            e instanceof Error ? e.message : "Unknown error fetching JWKS"
        }
      }
    }

    if (!didDocument) {
      return {
        didDocument: null,
        didDocumentMetadata: {},
        didResolutionMetadata: { error: "notFound", message: "No JWKS found" }
      }
    }

    return {
      didDocument,
      didDocumentMetadata: {},
      didResolutionMetadata: { contentType: "application/did+ld+json" }
    }
  }

  return {
    jwks: resolve
  }
}
