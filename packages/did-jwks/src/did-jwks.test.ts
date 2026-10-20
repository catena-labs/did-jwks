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
import type { Did } from "web-identity-schemas"

import { InvalidDidError } from "./base-url"
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

  it("skips symmetric (oct) keys instead of publishing the secret", async () => {
    const mockFetch = mockFetchFn({
      keys: [
        {
          kty: "oct",
          kid: "sym-1",
          k: "AyM1SysPpbyDfgZld3umj1qzKObwVMkoqQ-EstJQLr_T-1qS0gZH75aKtMN3Yj0iPS4hcgUuTwjAzZr1Z9CAow"
        },
        {
          kty: "RSA",
          use: "sig",
          kid: "pub-1",
          n: "test-n-value",
          e: "AQAB"
        }
      ]
    })

    const did = "did:jwks:example.com"
    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(doc).toBeTruthy()
    expect(doc?.verificationMethod).toHaveLength(1)
    expect(JSON.stringify(doc)).not.toContain("AyM1SysPpbyDfgZld3umj1qzKObw")
  })

  it("skips keys carrying private material instead of leaking it", async () => {
    const mockFetch = mockFetchFn({
      keys: [
        {
          kty: "RSA",
          kid: "priv-1",
          n: "test-n-value",
          e: "AQAB",
          d: "test-d-value"
        },
        {
          kty: "RSA",
          use: "sig",
          kid: "pub-1",
          n: "test-n-value-2",
          e: "AQAB"
        }
      ]
    })

    const did = "did:jwks:example.com"
    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(doc).toBeTruthy()
    expect(doc?.verificationMethod).toHaveLength(1)
    expect(JSON.stringify(doc)).not.toContain("test-d-value")
  })

  it("dedupes keys with identical thumbprints", async () => {
    const mockFetch = mockFetchFn({
      keys: [
        {
          kty: "RSA",
          use: "sig",
          kid: "key-1",
          n: "same-n-value",
          e: "AQAB"
        },
        {
          kty: "RSA",
          use: "sig",
          kid: "key-2",
          n: "same-n-value",
          e: "AQAB"
        }
      ]
    })

    const did = "did:jwks:example.com"
    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(doc).toBeTruthy()
    expect(doc?.verificationMethod).toHaveLength(1)
  })
})

describe("fetchJwksDidDocument() authority validation", () => {
  it.each<[string, Did<"jwks">]>([
    ["an IP-literal authority", "did:jwks:169.254.169.254"],
    ["a port on a host not in allowedHttpHosts", "did:jwks:127.0.0.1%3A9200"],
    [
      "userinfo in a percent-encoded @",
      "did:jwks:accounts.google.com%40evil.example"
    ],
    ["a bracketed IPv6 authority", "did:jwks:%5B%3A%3A1%5D"],
    ["a dot segment in the path", "did:jwks:example.com:tenant:%2E%2E:admin"]
  ])("rejects %s before any fetch", async (_, did) => {
    const mockFetch = createMockFetch({})

    await expect(
      fetchJwksDidDocument(did, { fetch: mockFetch })
    ).rejects.toThrow(InvalidDidError)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("keeps a path segment that decodes to a slash inside its segment", async () => {
    const mockFetch = createMockFetch({})

    await fetchJwksDidDocument("did:jwks:example.com:foo%2Fbar", {
      fetch: mockFetch
    })

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "https://example.com/.well-known/openid-configuration/foo%2Fbar",
      fetchInit
    )
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "https://example.com/foo%2Fbar/jwks.json",
      fetchInit
    )
  })

  it("matches allowedHttpHosts without regard to case in every check", async () => {
    const mockFetch = createMockFetch({
      "http://localhost:9200/.well-known/openid-configuration": {
        issuer: "http://localhost:9200",
        jwks_uri: "http://localhost:9200/keys"
      },
      "http://localhost:9200/keys": { keys: [rsaKey] }
    })

    const did = "did:jwks:LocalHost%3A9200"
    const doc = await fetchJwksDidDocument(did, {
      fetch: mockFetch,
      allowedHttpHosts: ["LocalHost"]
    })

    expectJwksDidDocument(did, doc)
  })

  it("allows a port on a host in allowedHttpHosts", async () => {
    const mockFetch = createMockFetch({})

    await fetchJwksDidDocument("did:jwks:127.0.0.1%3A9200", {
      fetch: mockFetch,
      allowedHttpHosts: ["127.0.0.1"]
    })

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:9200/.well-known/jwks.json",
      fetchInit
    )
  })
})
