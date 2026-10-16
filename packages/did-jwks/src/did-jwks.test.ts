import {
  createMockFetch,
  createMockOidcHost,
  expectJwksDidDocument,
  mockFetchFn,
  mockFetchStatus
} from "@repo/test-utils"
import accountsGoogleJwks from "@repo/test-utils/fixtures/accounts-google-jwks.json"
import accountsGoogleOidc from "@repo/test-utils/fixtures/accounts-google-oidc.json"
import appleidAppleJwks from "@repo/test-utils/fixtures/appleid-apple-jwks.json"
import appleidAppleOidc from "@repo/test-utils/fixtures/appleid-apple-oidc.json"
import exampleAuth0Jwks from "@repo/test-utils/fixtures/example-auth0-jwks.json"
import tokenActionsGitHubJwks from "@repo/test-utils/fixtures/token-actions-githubusercontent-jwks.json"
import { describe, it, expect, vi, afterEach } from "vitest"

import { fetchJwksDidDocument } from "./fetch"

const rsaKey = {
  kty: "RSA",
  use: "sig",
  kid: "test-key-1",
  alg: "RS256",
  n: "test-n-value",
  e: "AQAB"
}

describe("fetchJwksDidDocument()", () => {
  afterEach(() => {
    vi.restoreAllMocks()
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

  it("handles subdirectories with direct path resolution", async () => {
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

    // Path DIDs resolve to direct file paths, not .well-known
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/user/alice/jwks.json"
    )
    expectJwksDidDocument(did, doc)
  })

  it("does not fall back to RFC 8414 discovery for path DIDs", async () => {
    const mockFetch = createMockFetch({
      "http://localhost:3000/.well-known/openid-configuration/user/alice": {
        issuer: "http://localhost:3000/user/alice",
        jwks_uri: "http://localhost:3000/user/alice/keys"
      },
      "http://localhost:3000/user/alice/keys": { keys: [rsaKey] }
    })

    const did = "did:jwks:localhost%3A3000:user:alice"
    const doc = await fetchJwksDidDocument(did, {
      fetch: mockFetch,
      allowedHttpHosts: ["localhost"]
    })

    expect(doc).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/user/alice/jwks.json"
    )
  })

  it("does not resolve did:jwks:accounts.google.com without opt-in discovery", async () => {
    const mockFetch = createMockOidcHost({
      jwks: accountsGoogleJwks,
      oidc: accountsGoogleOidc
    })

    const did = "did:jwks:accounts.google.com"
    const doc = await fetchJwksDidDocument(did, {
      fetch: mockFetch
    })

    expect(doc).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      "https://accounts.google.com/.well-known/jwks.json"
    )
  })

  it("does not resolve did:jwks:appleid.apple.com without opt-in discovery", async () => {
    const mockFetch = createMockOidcHost({
      jwks: appleidAppleJwks,
      oidc: appleidAppleOidc
    })

    const did = "did:jwks:appleid.apple.com"
    const doc = await fetchJwksDidDocument(did, {
      fetch: mockFetch
    })

    expect(doc).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      "https://appleid.apple.com/.well-known/jwks.json"
    )
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

  it("resolves did:jwks:example.auth0.com", async () => {
    const mockFetch = mockFetchFn(exampleAuth0Jwks)

    const did = "did:jwks:example.auth0.com"
    const doc = await fetchJwksDidDocument(did, {
      fetch: mockFetch
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.auth0.com/.well-known/jwks.json"
    )
    expectJwksDidDocument(did, doc)
  })

  it("uses thumbprints for stable fragment identifiers", async () => {
    const jwksWithMultipleKeys = {
      keys: [
        {
          kty: "RSA",
          use: "sig",
          kid: "key-1",
          n: "test-n-value-1",
          e: "AQAB"
        },
        {
          kty: "RSA",
          use: "sig",
          kid: "key-2",
          n: "test-n-value-2",
          e: "AQAB"
        }
      ]
    }

    const mockFetch = mockFetchFn(jwksWithMultipleKeys)
    const did = "did:jwks:example.com"
    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(doc).toBeTruthy()
    if (!doc) {
      return
    }

    // Should have 2 verification methods
    expect(doc.verificationMethod).toHaveLength(2)

    // All fragment IDs should use thumbprints, not kid values
    doc.verificationMethod?.forEach((vm) => {
      expect(vm.id).toMatch(/^did:jwks:example\.com#[A-Za-z0-9_-]+$/)
      expect(vm.id).not.toContain("key-1")
      expect(vm.id).not.toContain("key-2")
    })
  })

  it("returns null without discovery when the JWKS document is malformed", async () => {
    const mockFetch = mockFetchFn({})

    const did = "did:jwks:example.com"
    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(doc).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/.well-known/jwks.json"
    )
  })

  it("returns null without discovery when the JWKS response is invalid JSON", async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.reject(new SyntaxError("Unexpected token"))
      })
    ) as unknown as typeof globalThis.fetch

    const did = "did:jwks:example.com"
    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(doc).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/.well-known/jwks.json"
    )
  })

  it.each([404, 403, 500])(
    "returns null without discovery when the JWKS location returns %i",
    async (status) => {
      const mockFetch = mockFetchStatus(status)

      const did = "did:jwks:example.com"
      const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

      expect(doc).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/.well-known/jwks.json"
      )
    }
  )

  it("rejects without discovery when the JWKS fetch has a network error", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValue(
        new TypeError("fetch failed")
      ) as unknown as typeof globalThis.fetch

    const did = "did:jwks:example.com"

    await expect(
      fetchJwksDidDocument(did, { fetch: mockFetch })
    ).rejects.toThrow("fetch failed")
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("rethrows non-syntax JSON read failures", async () => {
    const error = new Error("body stream aborted")
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.reject(error)
      })
    ) as unknown as typeof globalThis.fetch

    const did = "did:jwks:example.com"

    await expect(
      fetchJwksDidDocument(did, { fetch: mockFetch })
    ).rejects.toThrow("body stream aborted")
  })
})
