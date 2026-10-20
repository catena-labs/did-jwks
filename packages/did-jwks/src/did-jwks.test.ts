import {
  createMockFetch,
  expectJwksDidDocument,
  fetchInit
} from "@repo/test-utils"
import accountsGoogleJwks from "@repo/test-utils/fixtures/accounts-google-jwks.json"
import accountsGoogleOidc from "@repo/test-utils/fixtures/accounts-google-oidc.json"
import appleidAppleJwks from "@repo/test-utils/fixtures/appleid-apple-jwks.json"
import appleidAppleOidc from "@repo/test-utils/fixtures/appleid-apple-oidc.json"
import exampleAuth0Jwks from "@repo/test-utils/fixtures/example-auth0-jwks.json"
import exampleAuth0Oidc from "@repo/test-utils/fixtures/example-auth0-oidc.json"
import tokenActionsGitHubJwks from "@repo/test-utils/fixtures/token-actions-githubusercontent-jwks.json"
import tokenActionsGitHubOidc from "@repo/test-utils/fixtures/token-actions-githubusercontent-oidc.json"
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
    const mockFetch = createMockFetch({
      "http://localhost:3000/.well-known/jwks.json": { keys: [rsaKey] }
    })

    const did = "did:jwks:localhost%3A3000"
    const doc = await fetchJwksDidDocument(did, {
      fetch: mockFetch,
      allowedHttpHosts: ["localhost"]
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/.well-known/openid-configuration",
      fetchInit
    )
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/.well-known/jwks.json",
      fetchInit
    )
    expectJwksDidDocument(did, doc)
  })

  it("falls back to the direct path for path DIDs after a discovery 404", async () => {
    const mockFetch = createMockFetch({
      "http://localhost:3000/user/alice/jwks.json": { keys: [rsaKey] }
    })

    const did = "did:jwks:localhost%3A3000:user:alice"
    const doc = await fetchJwksDidDocument(did, {
      fetch: mockFetch,
      allowedHttpHosts: ["localhost"]
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/.well-known/openid-configuration/user/alice",
      fetchInit
    )
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/user/alice/jwks.json",
      fetchInit
    )
    expectJwksDidDocument(did, doc)
  })

  it("resolves did:jwks:accounts.google.com through discovery", async () => {
    const mockFetch = createMockFetch({
      "https://accounts.google.com/.well-known/openid-configuration":
        accountsGoogleOidc,
      "https://www.googleapis.com/oauth2/v3/certs": accountsGoogleJwks
    })

    const did = "did:jwks:accounts.google.com"
    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "https://accounts.google.com/.well-known/openid-configuration",
      fetchInit
    )
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "https://www.googleapis.com/oauth2/v3/certs",
      fetchInit
    )
    expectJwksDidDocument(did, doc)
  })

  it("resolves did:jwks:appleid.apple.com through discovery", async () => {
    const mockFetch = createMockFetch({
      "https://appleid.apple.com/.well-known/openid-configuration":
        appleidAppleOidc,
      "https://appleid.apple.com/auth/keys": appleidAppleJwks
    })

    const did = "did:jwks:appleid.apple.com"
    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "https://appleid.apple.com/auth/keys",
      fetchInit
    )
    expectJwksDidDocument(did, doc)
  })

  it("resolves did:jwks:token.actions.githubusercontent.com through discovery", async () => {
    const mockFetch = createMockFetch({
      "https://token.actions.githubusercontent.com/.well-known/openid-configuration":
        tokenActionsGitHubOidc,
      "https://token.actions.githubusercontent.com/.well-known/jwks":
        tokenActionsGitHubJwks
    })

    const did = "did:jwks:token.actions.githubusercontent.com"
    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "https://token.actions.githubusercontent.com/.well-known/jwks",
      fetchInit
    )
    expectJwksDidDocument(did, doc)
  })

  it("resolves did:jwks:example.auth0.com through discovery with a trailing-slash issuer", async () => {
    const mockFetch = createMockFetch({
      "https://example.auth0.com/.well-known/openid-configuration":
        exampleAuth0Oidc,
      "https://example.auth0.com/.well-known/jwks.json": exampleAuth0Jwks
    })

    const did = "did:jwks:example.auth0.com"
    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "https://example.auth0.com/.well-known/openid-configuration",
      fetchInit
    )
    expectJwksDidDocument(did, doc)
  })

  it("uses thumbprints for stable fragment identifiers", async () => {
    const mockFetch = createMockFetch({
      "https://example.com/.well-known/jwks.json": {
        keys: [
          { kty: "RSA", use: "sig", kid: "key-1", n: "n-1", e: "AQAB" },
          { kty: "RSA", use: "sig", kid: "key-2", n: "n-2", e: "AQAB" }
        ]
      }
    })
    const did = "did:jwks:example.com"
    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(doc?.verificationMethod).toHaveLength(2)
    doc?.verificationMethod?.forEach((vm) => {
      expect(vm.id).toMatch(/^did:jwks:example\.com#[A-Za-z0-9_-]+$/)
      expect(vm.id).not.toContain("key-1")
      expect(vm.id).not.toContain("key-2")
    })
  })

  it("returns null when neither discovery nor the JWKS exists", async () => {
    const mockFetch = createMockFetch({})

    const doc = await fetchJwksDidDocument("did:jwks:example.com", {
      fetch: mockFetch
    })

    expect(doc).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it("returns null when the fallback JWKS is malformed", async () => {
    const mockFetch = createMockFetch({
      "https://example.com/.well-known/jwks.json": { keys: "not-an-array" }
    })

    const doc = await fetchJwksDidDocument("did:jwks:example.com", {
      fetch: mockFetch
    })

    expect(doc).toBeNull()
  })

  describe("keys that are not understood (RFC 7517 section 5)", () => {
    // RFC 7515 Appendix A.3 example key.
    const sigKey = {
      kty: "EC",
      crv: "P-256",
      kid: "sig",
      use: "sig",
      alg: "ES256",
      x: "f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU",
      y: "x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0"
    }
    // RFC 7517 Appendix A.1 example EC key, with a JWE key management `alg`.
    const ecdhEncKey = {
      kty: "EC",
      crv: "P-256",
      kid: "enc",
      use: "enc",
      alg: "ECDH-ES",
      x: "MKBCTNIcKUSDii11ySs3526iDZ8AiTo7Tu6KPAqv7D4",
      y: "4Etl6SRW2YiLUrN5vfvVHuhp7x8PxltmWWlbbM4IFyM"
    }
    // A key type this resolver does not know (ML-DSA, draft-ietf-cose-dilithium).
    const unknownKtyKey = {
      kty: "AKP",
      kid: "pq",
      alg: "ML-DSA-44",
      pub: "AAAA"
    }

    function resolveWith(keys: unknown[]) {
      const mockFetch = createMockFetch({
        "https://example.com/.well-known/jwks.json": { keys }
      })
      return fetchJwksDidDocument("did:jwks:example.com", { fetch: mockFetch })
    }

    it("ignores an encryption key with a JWE alg and resolves the rest", async () => {
      const doc = await resolveWith([sigKey, ecdhEncKey])

      expect(doc?.verificationMethod).toHaveLength(1)
      expect(doc?.verificationMethod?.[0]).toMatchObject({
        publicKeyJwk: { kid: "sig" }
      })
      expect(doc?.authentication).toEqual([doc?.verificationMethod?.[0]?.id])
    })

    it("ignores a key with an unknown kty and resolves the rest", async () => {
      const doc = await resolveWith([unknownKtyKey, sigKey])

      expect(doc?.verificationMethod).toHaveLength(1)
      expect(doc?.verificationMethod?.[0]).toMatchObject({
        publicKeyJwk: { kid: "sig" }
      })
    })

    it("ignores entries that are not JWK objects", async () => {
      const doc = await resolveWith(["not-a-key", null, sigKey])

      expect(doc?.verificationMethod).toHaveLength(1)
    })

    it("ignores a key that is missing a required member", async () => {
      const { y: _y, ...missingY } = {
        ...ecdhEncKey,
        kid: "no-y",
        alg: "ES256"
      }
      const doc = await resolveWith([missingY, sigKey])

      expect(doc?.verificationMethod).toHaveLength(1)
      expect(doc?.verificationMethod?.[0]).toMatchObject({
        publicKeyJwk: { kid: "sig" }
      })
    })

    it("ignores a key with an unsupported curve", async () => {
      const doc = await resolveWith([
        { ...sigKey, kid: "p192", crv: "P-192" },
        sigKey
      ])

      expect(doc?.verificationMethod).toHaveLength(1)
      expect(doc?.verificationMethod?.[0]).toMatchObject({
        publicKeyJwk: { kid: "sig" }
      })
    })

    it("ignores keys that are not understood at a discovered jwks_uri", async () => {
      const jwksUri = "https://keys.example.com/jwks"
      const mockFetch = createMockFetch({
        "https://example.com/.well-known/openid-configuration": {
          issuer: "https://example.com",
          jwks_uri: jwksUri
        },
        [jwksUri]: { keys: [unknownKtyKey, sigKey] }
      })

      const doc = await fetchJwksDidDocument("did:jwks:example.com", {
        fetch: mockFetch
      })

      expect(doc?.verificationMethod).toHaveLength(1)
      expect(doc?.verificationMethod?.[0]).toMatchObject({
        publicKeyJwk: { kid: "sig" }
      })
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it("returns null when no key in the set is understood", async () => {
      const doc = await resolveWith([unknownKtyKey, ecdhEncKey])

      expect(doc).toBeNull()
    })
  })

  it("rethrows non-syntax JSON read failures", async () => {
    const error = new Error("body stream aborted")
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(error)
      })
    ) as unknown as typeof globalThis.fetch

    await expect(
      fetchJwksDidDocument("did:jwks:example.com", { fetch: mockFetch })
    ).rejects.toThrow("body stream aborted")
  })
})
