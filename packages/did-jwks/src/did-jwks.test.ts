import { describe, it, expect, vi, afterEach } from "vitest"
import { fetchJwksDidDocument } from "./fetch"
import {
  createMockOidcHost,
  expectJwksDidDocument,
  mockFetchFn
} from "@repo/test-utils"
import accountsGoogleOidc from "@repo/test-utils/fixtures/accounts-google-oidc.json"
import accountsGoogleJwks from "@repo/test-utils/fixtures/accounts-google-jwks.json"
import appleidAppleOidc from "@repo/test-utils/fixtures/appleid-apple-oidc.json"
import appleidAppleJwks from "@repo/test-utils/fixtures/appleid-apple-jwks.json"
import tokenActionsGitHubJwks from "@repo/test-utils/fixtures/token-actions-githubusercontent-jwks.json"
import exampleAuth0Jwks from "@repo/test-utils/fixtures/example-auth0-jwks.json"

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
    if (!doc) return

    // Should have 2 verification methods
    expect(doc.verificationMethod).toHaveLength(2)

    // All fragment IDs should use thumbprints, not kid values
    doc.verificationMethod?.forEach((vm) => {
      expect(vm.id).toMatch(/^did:jwks:example\.com#[A-Za-z0-9_-]+$/)
      expect(vm.id).not.toContain("key-1")
      expect(vm.id).not.toContain("key-2")
    })
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
