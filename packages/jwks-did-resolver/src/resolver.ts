import { isDidJwks, fetchJwksDidDocument } from "did-jwks"
import type { FetchJwksOptions } from "did-jwks"
import type {
  DIDResolutionOptions,
  DIDResolutionResult,
  DIDResolver,
  ParsedDID,
  Resolvable
} from "did-resolver"

const DID_JWKS_CONTENT_TYPE = "application/did+ld+json"

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
  async function resolve(
    did: string,
    _parsed: ParsedDID,
    _resolver: Resolvable,
    options: DIDResolutionOptions = {}
  ): Promise<DIDResolutionResult> {
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

    if (!supportsAccept(options.accept)) {
      return {
        didDocument: null,
        didDocumentMetadata: {},
        didResolutionMetadata: {
          error: "representationNotSupported",
          message: `Unsupported DID representation: ${options.accept}`
        }
      }
    }

    let didDocument
    try {
      didDocument = await fetchJwksDidDocument(did, opts)
    } catch (e) {
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
      didResolutionMetadata: { contentType: DID_JWKS_CONTENT_TYPE }
    }
  }

  return {
    jwks: resolve
  }
}

function supportsAccept(accept?: string): boolean {
  if (!accept) {
    return true
  }

  return accept.split(",").some((value) => {
    const [mediaType] = value.trim().split(";")
    return mediaType === DID_JWKS_CONTENT_TYPE || mediaType === "*/*"
  })
}
