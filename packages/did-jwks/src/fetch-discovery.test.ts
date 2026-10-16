import { createMockFetch, expectJwksDidDocument } from "@repo/test-utils"
import accountsGoogleJwks from "@repo/test-utils/fixtures/accounts-google-jwks.json"
import accountsGoogleOidc from "@repo/test-utils/fixtures/accounts-google-oidc.json"
import appleidAppleJwks from "@repo/test-utils/fixtures/appleid-apple-jwks.json"
import appleidAppleOidc from "@repo/test-utils/fixtures/appleid-apple-oidc.json"
import tokenActionsGitHubJwks from "@repo/test-utils/fixtures/token-actions-githubusercontent-jwks.json"
import tokenActionsGitHubOidc from "@repo/test-utils/fixtures/token-actions-githubusercontent-oidc.json"
import { describe, expect, it, vi } from "vitest"

import { fetchJwksDidDocument } from "./fetch"

function rsaKey(kid: string) {
  return { kty: "RSA", use: "sig", kid, n: `n-${kid}`, e: "AQAB" }
}

function keyIds(doc: Awaited<ReturnType<typeof fetchJwksDidDocument>>) {
  return doc?.verificationMethod?.map((vm) =>
    "publicKeyJwk" in vm ? vm.publicKeyJwk?.kid : undefined
  )
}

const exampleDid = "did:jwks:example.com"
const exampleFixedJwks = "https://example.com/.well-known/jwks.json"
const exampleDiscovery = "https://example.com/.well-known/openid-configuration"
const exampleJwksUri = "https://keys.example.com/jwks"

describe("fetchJwksDidDocument() with opt-in discovery", () => {
  it("resolves did:jwks:accounts.google.com with a cross-origin jwks_uri", async () => {
    const mockFetch = createMockFetch({
      "https://accounts.google.com/.well-known/openid-configuration":
        accountsGoogleOidc,
      "https://www.googleapis.com/oauth2/v3/certs": accountsGoogleJwks
    })

    const did = "did:jwks:accounts.google.com"
    const doc = await fetchJwksDidDocument(did, {
      fetch: mockFetch,
      discoveryDids: [did]
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "https://accounts.google.com/.well-known/openid-configuration"
    )
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "https://www.googleapis.com/oauth2/v3/certs"
    )
    expectJwksDidDocument(did, doc)
  })

  it("resolves did:jwks:token.actions.githubusercontent.com", async () => {
    const mockFetch = createMockFetch({
      "https://token.actions.githubusercontent.com/.well-known/openid-configuration":
        tokenActionsGitHubOidc,
      "https://token.actions.githubusercontent.com/.well-known/jwks":
        tokenActionsGitHubJwks
    })

    const did = "did:jwks:token.actions.githubusercontent.com"
    const doc = await fetchJwksDidDocument(did, {
      fetch: mockFetch,
      discoveryDids: [did]
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expectJwksDidDocument(did, doc)
  })

  it("resolves did:jwks:appleid.apple.com", async () => {
    const mockFetch = createMockFetch({
      "https://appleid.apple.com/.well-known/openid-configuration":
        appleidAppleOidc,
      "https://appleid.apple.com/auth/keys": appleidAppleJwks
    })

    const did = "did:jwks:appleid.apple.com"
    const doc = await fetchJwksDidDocument(did, {
      fetch: mockFetch,
      discoveryDids: [did]
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expectJwksDidDocument(did, doc)
  })

  it("uses only the jwks_uri key set and never reads the fixed path", async () => {
    const mockFetch = createMockFetch({
      [exampleFixedJwks]: { keys: [rsaKey("fixed")] },
      [exampleDiscovery]: {
        issuer: "https://example.com",
        jwks_uri: exampleJwksUri
      },
      [exampleJwksUri]: { keys: [rsaKey("discovered")] }
    })

    const doc = await fetchJwksDidDocument(exampleDid, {
      fetch: mockFetch,
      discoveryDids: [exampleDid]
    })

    expect(keyIds(doc)).toEqual(["discovered"])
    expect(mockFetch).not.toHaveBeenCalledWith(exampleFixedJwks)
  })

  it("uses only the fixed path key set for DIDs that are not configured", async () => {
    const mockFetch = createMockFetch({
      [exampleFixedJwks]: { keys: [rsaKey("fixed")] },
      [exampleDiscovery]: {
        issuer: "https://example.com",
        jwks_uri: exampleJwksUri
      },
      [exampleJwksUri]: { keys: [rsaKey("discovered")] }
    })

    const doc = await fetchJwksDidDocument(exampleDid, {
      fetch: mockFetch,
      discoveryDids: ["did:jwks:other.example.com"]
    })

    expect(keyIds(doc)).toEqual(["fixed"])
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(exampleFixedJwks)
  })

  it("does not use discovery for a DID that is not configured", async () => {
    const mockFetch = createMockFetch({
      "https://appleid.apple.com/.well-known/openid-configuration":
        appleidAppleOidc,
      "https://appleid.apple.com/auth/keys": appleidAppleJwks
    })

    const doc = await fetchJwksDidDocument("did:jwks:appleid.apple.com", {
      fetch: mockFetch,
      discoveryDids: ["did:jwks:accounts.google.com"]
    })

    expect(doc).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      "https://appleid.apple.com/.well-known/jwks.json"
    )
  })

  it("returns null without reading the fixed path when discovery is missing", async () => {
    const mockFetch = createMockFetch({
      [exampleFixedJwks]: { keys: [rsaKey("fixed")] }
    })

    const doc = await fetchJwksDidDocument(exampleDid, {
      fetch: mockFetch,
      discoveryDids: [exampleDid]
    })

    expect(doc).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(exampleDiscovery)
  })

  it("returns null without reading the fixed path when the jwks_uri returns 404", async () => {
    const mockFetch = createMockFetch({
      [exampleFixedJwks]: { keys: [rsaKey("fixed")] },
      [exampleDiscovery]: {
        issuer: "https://example.com",
        jwks_uri: exampleJwksUri
      }
    })

    const doc = await fetchJwksDidDocument(exampleDid, {
      fetch: mockFetch,
      discoveryDids: [exampleDid]
    })

    expect(doc).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).not.toHaveBeenCalledWith(exampleFixedJwks)
  })

  it.each([
    ["a different origin", "https://evil.example"],
    ["a trailing slash", "https://example.com/"],
    ["a different scheme", "http://example.com"],
    ["a different case", "https://EXAMPLE.com"],
    ["a path", "https://example.com/tenant"]
  ])("returns null when the issuer has %s", async (_description, issuer) => {
    const mockFetch = createMockFetch({
      [exampleDiscovery]: { issuer, jwks_uri: exampleJwksUri },
      [exampleJwksUri]: { keys: [rsaKey("discovered")] }
    })

    const doc = await fetchJwksDidDocument(exampleDid, {
      fetch: mockFetch,
      discoveryDids: [exampleDid]
    })

    expect(doc).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).not.toHaveBeenCalledWith(exampleJwksUri)
  })

  it.each([
    ["no issuer", { jwks_uri: exampleJwksUri }],
    ["no jwks_uri", { issuer: "https://example.com" }],
    ["an invalid jwks_uri", { issuer: "https://example.com", jwks_uri: "x" }]
  ])(
    "returns null when the discovery document has %s",
    async (_description, discovery) => {
      const mockFetch = createMockFetch({
        [exampleFixedJwks]: { keys: [rsaKey("fixed")] },
        [exampleDiscovery]: discovery,
        [exampleJwksUri]: { keys: [rsaKey("discovered")] }
      })

      const doc = await fetchJwksDidDocument(exampleDid, {
        fetch: mockFetch,
        discoveryDids: [exampleDid]
      })

      expect(doc).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    }
  )

  it("returns null when jwks_uri does not use https", async () => {
    const insecureJwksUri = "http://keys.example.com/jwks"
    const mockFetch = createMockFetch({
      [exampleDiscovery]: {
        issuer: "https://example.com",
        jwks_uri: insecureJwksUri
      },
      [insecureJwksUri]: { keys: [rsaKey("discovered")] }
    })

    const doc = await fetchJwksDidDocument(exampleDid, {
      fetch: mockFetch,
      discoveryDids: [exampleDid]
    })

    expect(doc).toBeNull()
    expect(mockFetch).not.toHaveBeenCalledWith(insecureJwksUri)
  })

  it("returns null when an https identity names an http jwks_uri on an allowed http host", async () => {
    const localJwksUri = "http://localhost/keys"
    const mockFetch = createMockFetch({
      [exampleDiscovery]: {
        issuer: "https://example.com",
        jwks_uri: localJwksUri
      },
      [localJwksUri]: { keys: [rsaKey("discovered")] }
    })

    const doc = await fetchJwksDidDocument(exampleDid, {
      fetch: mockFetch,
      allowedHttpHosts: ["localhost"],
      discoveryDids: [exampleDid]
    })

    expect(doc).toBeNull()
    expect(mockFetch).not.toHaveBeenCalledWith(localJwksUri)
  })

  it("allows an http jwks_uri for an http identity on an allowed http host", async () => {
    const did = "did:jwks:localhost%3A3000"
    const jwksUri = "http://localhost:3000/keys"
    const mockFetch = createMockFetch({
      "http://localhost:3000/.well-known/openid-configuration": {
        issuer: "http://localhost:3000",
        jwks_uri: jwksUri
      },
      [jwksUri]: { keys: [rsaKey("discovered")] }
    })

    const doc = await fetchJwksDidDocument(did, {
      fetch: mockFetch,
      allowedHttpHosts: ["localhost"],
      discoveryDids: [did]
    })

    expect(keyIds(doc)).toEqual(["discovered"])
  })

  it("rejects without reading the fixed path when discovery has a network error", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValue(
        new TypeError("fetch failed")
      ) as unknown as typeof globalThis.fetch

    await expect(
      fetchJwksDidDocument(exampleDid, {
        fetch: mockFetch,
        discoveryDids: [exampleDid]
      })
    ).rejects.toThrow("fetch failed")
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(exampleDiscovery)
  })

  describe("path DIDs", () => {
    const did = "did:jwks:auth.example.com:tenant123"
    const insertionForm =
      "https://auth.example.com/.well-known/openid-configuration/tenant123"
    const appendForm =
      "https://auth.example.com/tenant123/.well-known/openid-configuration"
    const fixedJwks = "https://auth.example.com/tenant123/jwks.json"
    const jwksUri = "https://auth.example.com/tenant123/keys"

    it("uses the RFC 8414 insertion form and requires the path in issuer", async () => {
      const mockFetch = createMockFetch({
        [insertionForm]: {
          issuer: "https://auth.example.com/tenant123",
          jwks_uri: jwksUri
        },
        [jwksUri]: { keys: [rsaKey("discovered")] }
      })

      const doc = await fetchJwksDidDocument(did, {
        fetch: mockFetch,
        discoveryDids: [did]
      })

      expect(keyIds(doc)).toEqual(["discovered"])
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenNthCalledWith(1, insertionForm)
      expect(mockFetch).toHaveBeenNthCalledWith(2, jwksUri)
    })

    it("does not read the path-append form or the fixed path after a 404", async () => {
      const mockFetch = createMockFetch({
        [appendForm]: {
          issuer: "https://auth.example.com/tenant123",
          jwks_uri: jwksUri
        },
        [fixedJwks]: { keys: [rsaKey("fixed")] },
        [jwksUri]: { keys: [rsaKey("discovered")] }
      })

      const doc = await fetchJwksDidDocument(did, {
        fetch: mockFetch,
        discoveryDids: [did]
      })

      expect(doc).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(insertionForm)
    })

    it("returns null when the issuer is the origin only", async () => {
      const mockFetch = createMockFetch({
        [insertionForm]: {
          issuer: "https://auth.example.com",
          jwks_uri: jwksUri
        },
        [jwksUri]: { keys: [rsaKey("discovered")] }
      })

      const doc = await fetchJwksDidDocument(did, {
        fetch: mockFetch,
        discoveryDids: [did]
      })

      expect(doc).toBeNull()
      expect(mockFetch).not.toHaveBeenCalledWith(jwksUri)
    })
  })
})
