import {
  createMockOidcHost,
  expectJwksDidDocument,
  mockFetchFn
} from "@repo/test-utils"
import accountsGoogleJwks from "@repo/test-utils/fixtures/accounts-google-jwks.json"
import accountsGoogleOidc from "@repo/test-utils/fixtures/accounts-google-oidc.json"
import appleidAppleJwks from "@repo/test-utils/fixtures/appleid-apple-jwks.json"
import appleidAppleOidc from "@repo/test-utils/fixtures/appleid-apple-oidc.json"
import exampleAuth0Jwks from "@repo/test-utils/fixtures/example-auth0-jwks.json"
import tokenActionsGitHubJwks from "@repo/test-utils/fixtures/token-actions-githubusercontent-jwks.json"
import { Resolver } from "did-resolver"
import { expect, describe, it, vi, afterEach } from "vitest"

import { getResolver } from "./resolver"

describe("Resolver", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("resolves did:jwks:accounts.google.com", async () => {
    const mockFetch = createMockOidcHost({
      jwks: accountsGoogleJwks,
      oidc: accountsGoogleOidc
    })

    const did = "did:jwks:accounts.google.com"
    const resolver = new Resolver(getResolver({ fetch: mockFetch }))
    const doc = await resolver.resolve(did)

    expect(mockFetch).toHaveBeenCalledTimes(3)
    // 404:
    expect(mockFetch).toHaveBeenCalledWith(
      "https://accounts.google.com/.well-known/jwks.json"
    )
    // Config:
    expect(mockFetch).toHaveBeenCalledWith(
      "https://accounts.google.com/.well-known/openid-configuration"
    )
    // JWKS:
    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.googleapis.com/oauth2/v3/certs"
    )
    expectJwksDidDocument(did, doc.didDocument)
  })

  it("resolves did:jwks:appleid.apple.com", async () => {
    const mockFetch = createMockOidcHost({
      jwks: appleidAppleJwks,
      oidc: appleidAppleOidc
    })

    const did = "did:jwks:appleid.apple.com"
    const resolver = new Resolver(getResolver({ fetch: mockFetch }))
    const doc = await resolver.resolve(did)

    expect(mockFetch).toHaveBeenCalledTimes(3)
    // 404:
    expect(mockFetch).toHaveBeenCalledWith(
      "https://appleid.apple.com/.well-known/jwks.json"
    )
    // Config:
    expect(mockFetch).toHaveBeenCalledWith(
      "https://appleid.apple.com/.well-known/openid-configuration"
    )
    // JWKS:
    expect(mockFetch).toHaveBeenCalledWith(
      "https://appleid.apple.com/auth/keys"
    )
    expectJwksDidDocument(did, doc.didDocument)
  })

  it("resolves did:jwks:token.actions.githubusercontent.com", async () => {
    const mockFetch = mockFetchFn(tokenActionsGitHubJwks)

    const did = "did:jwks:token.actions.githubusercontent.com"
    const resolver = new Resolver(getResolver({ fetch: mockFetch }))
    const doc = await resolver.resolve(did)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      "https://token.actions.githubusercontent.com/.well-known/jwks.json"
    )
    expectJwksDidDocument(did, doc.didDocument)
  })

  it("resolves did:jwks:example.auth0.com", async () => {
    const mockFetch = mockFetchFn(exampleAuth0Jwks)

    const did = "did:jwks:example.auth0.com"
    const resolver = new Resolver(getResolver({ fetch: mockFetch }))
    const doc = await resolver.resolve(did)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.auth0.com/.well-known/jwks.json"
    )
    expectJwksDidDocument(did, doc.didDocument)
  })

  it("resolves path-based DID through direct file path", async () => {
    const jwksData = {
      keys: [
        {
          kty: "RSA",
          use: "sig",
          kid: "tenant-key-1",
          alg: "RS256",
          n: "test-n-value",
          e: "AQAB"
        }
      ]
    }

    const mockFetch = vi.fn((url: string) => {
      if (url === "https://auth.example.com/tenant123/jwks.json") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(jwksData)
        })
      }
      return Promise.resolve({ ok: false, status: 404 })
    }) as unknown as typeof globalThis.fetch

    const did = "did:jwks:auth.example.com:tenant123"
    const resolver = new Resolver(getResolver({ fetch: mockFetch }))
    const doc = await resolver.resolve(did)

    expect(mockFetch).toHaveBeenCalledWith(
      "https://auth.example.com/tenant123/jwks.json"
    )
    expectJwksDidDocument(did, doc.didDocument)
  })

  it("returns notFound, not internalError, when fetch fails at the network level on every URL", async () => {
    // A DNS/connection/TLS-level failure (what `fetch()` itself rejects
    // with) is exactly as much "could not be fetched" as a non-ok HTTP
    // response is — see `fetchWithSchema`. With no reachable URL at all,
    // the correct DID resolution error code is `notFound` (nothing could
    // be resolved), not `internalError` (which is for genuine
    // implementation failures, not an unreachable target).
    const mockFetch = vi
      .fn()
      .mockRejectedValue(
        new Error("Network timeout")
      ) as unknown as typeof globalThis.fetch

    const did = "did:jwks:example.com"
    const resolver = new Resolver(getResolver({ fetch: mockFetch }))
    const doc = await resolver.resolve(did)

    expect(doc.didDocument).toBeNull()
    expect(doc.didResolutionMetadata.error).toBe("notFound")
    expect(doc.didResolutionMetadata.message).toBe("No JWKS found")
  })

  it("still reports internalError for a genuine unexpected failure (non-network, non-JSON-syntax)", async () => {
    // `internalError` remains reachable for failures `fetchWithSchema`
    // deliberately does NOT swallow — e.g. a body-read failure that isn't
    // a JSON syntax error. This pins that the network-level fix above
    // didn't accidentally make the internalError branch dead code.
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.reject(new Error("body stream aborted"))
      })
    ) as unknown as typeof globalThis.fetch

    const did = "did:jwks:example.com"
    const resolver = new Resolver(getResolver({ fetch: mockFetch }))
    const doc = await resolver.resolve(did)

    expect(doc.didDocument).toBeNull()
    expect(doc.didResolutionMetadata.error).toBe("internalError")
    expect(doc.didResolutionMetadata.message).toBe("body stream aborted")
  })

  it("returns error when no JWKS found", async () => {
    const mockFetch = mockFetchFn({})

    const did = "did:jwks:example.com"
    const resolver = new Resolver(
      getResolver({ fetch: mockFetch, allowedHttpHosts: ["localhost"] })
    )
    const doc = await resolver.resolve(did)

    expect(doc.didDocument).toBeNull()
    expect(doc.didResolutionMetadata.error).toBe("notFound")
    expect(doc.didResolutionMetadata.message).toBe("No JWKS found")
  })
})
