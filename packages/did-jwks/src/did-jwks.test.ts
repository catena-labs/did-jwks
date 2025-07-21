import { describe, it, expect, beforeEach, mock } from "bun:test"
import type { OpenIDConfiguration } from "./utils/schemas"
import { fetchJwksDidDocument } from "./fetch"
import { expectJwksDidDocument } from "@repo/test-helpers"
import accountsGoogleOidc from "@repo/test-helpers/fixtures/accounts-google-oidc.json"
import accountsGoogleJwks from "@repo/test-helpers/fixtures/accounts-google-jwks.json"
import appleidAppleOidc from "@repo/test-helpers/fixtures/appleid-apple-oidc.json"
import appleidAppleJwks from "@repo/test-helpers/fixtures/appleid-apple-jwks.json"
import tokenActionsGitHubJwks from "@repo/test-helpers/fixtures/token-actions-githubusercontent-jwks.json"

describe("fetchJwksDidDocument()", () => {
  beforeEach(() => {
    mock.restore()
  })

  it("handles localhost with ports", async () => {
    const mockFetch = mockFetchFn({
      keys: [
        {
          kty: "RSA",
          use: "sig",
          kid: "test-key-1",
          alg: "RS256",
          n: "test-n-value",
          e: "AQAB"
        }
      ]
    })

    const did = "did:jwks:localhost%3A3000"
    const doc = await fetchJwksDidDocument(did, {
      fetch: mockFetch,
      allowedHttpHosts: ["localhost"]
    })

    // Verify the fetch was called with the expected URL
    expect(mockFetch).toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/.well-known/jwks.json"
    )
    expectJwksDidDocument(did, doc)
  })

  it("handles subdirectories", async () => {
    const mockFetch = mockFetchFn({
      keys: [
        {
          kty: "RSA",
          use: "sig",
          kid: "test-key-1",
          alg: "RS256",
          n: "test-n-value",
          e: "AQAB"
        }
      ]
    })

    const did = "did:jwks:localhost%3A3000:user:alice"
    const doc = await fetchJwksDidDocument(did, {
      fetch: mockFetch,
      allowedHttpHosts: ["localhost"]
    })

    // Verify the fetch was called with the expected URL
    expect(mockFetch).toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/user/alice/.well-known/jwks.json"
    )
    expectJwksDidDocument(did, doc)
  })

  it("resolves did:jwks:accounts.google.com", async () => {
    const mockFetch = createMockOidcHost({
      jwks: accountsGoogleJwks,
      oidc: accountsGoogleOidc
    })

    const did = "did:jwks:accounts.google.com"
    const doc = await fetchJwksDidDocument(did, {
      fetch: mockFetch
    })

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
    expectJwksDidDocument(did, doc)
  })

  it("resolves did:jwks:appleid.apple.com", async () => {
    const mockFetch = createMockOidcHost({
      jwks: appleidAppleJwks,
      oidc: appleidAppleOidc
    })

    const did = "did:jwks:appleid.apple.com"
    const doc = await fetchJwksDidDocument(did, {
      fetch: mockFetch
    })

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
    expectJwksDidDocument(did, doc)
  })

  it("resolves did:jwks:token.actions.githubusercontent.com", async () => {
    const mockFetch = mockFetchFn(tokenActionsGitHubJwks)

    const did = "did:jwks:token.actions.githubusercontent.com"
    const doc = await fetchJwksDidDocument(did, {
      fetch: mockFetch
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      "https://token.actions.githubusercontent.com/.well-known/jwks.json"
    )
    expectJwksDidDocument(did, doc)
  })

  it("returns error when no JWKS found", async () => {
    const mockFetch = mockFetchFn({})

    const did = "did:jwks:example.com"
    const doc = await fetchJwksDidDocument(did, {
      fetch: mockFetch,
      allowedHttpHosts: ["localhost"]
    })

    expect(doc).toBeNull()
  })
})

function createMockOidcHost({
  jwks,
  oidc
}: {
  jwks: { keys: Record<string, unknown>[] }
  oidc: OpenIDConfiguration
}) {
  return mock((url: string) => {
    if (url.endsWith("/.well-known/openid-configuration")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(oidc)
      })
    }

    if (url === oidc.jwks_uri) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(jwks)
      })
    }

    return Promise.resolve({
      ok: false,
      status: 404
    })
  }) as unknown as typeof globalThis.fetch
}

function mockFetchFn(json = {}) {
  return mock(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(json)
    })
  ) as unknown as typeof globalThis.fetch
}
