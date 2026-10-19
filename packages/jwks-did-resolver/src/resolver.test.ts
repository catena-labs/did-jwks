import {
  createMockFetch,
  expectJwksDidDocument,
  fetchInit
} from "@repo/test-utils"
import accountsGoogleJwks from "@repo/test-utils/fixtures/accounts-google-jwks.json"
import accountsGoogleOidc from "@repo/test-utils/fixtures/accounts-google-oidc.json"
import exampleAuth0Jwks from "@repo/test-utils/fixtures/example-auth0-jwks.json"
import exampleAuth0Oidc from "@repo/test-utils/fixtures/example-auth0-oidc.json"
import tokenActionsGitHubJwks from "@repo/test-utils/fixtures/token-actions-githubusercontent-jwks.json"
import tokenActionsGitHubOidc from "@repo/test-utils/fixtures/token-actions-githubusercontent-oidc.json"
import { Resolver } from "did-resolver"
import { expect, describe, it, vi, afterEach } from "vitest"

import { getResolver } from "./resolver"

const rsaKey = {
  kty: "RSA",
  use: "sig",
  kid: "tenant-key-1",
  alg: "RS256",
  n: "test-n-value",
  e: "AQAB"
}

describe("Resolver", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("resolves did:jwks:accounts.google.com through discovery", async () => {
    const mockFetch = createMockFetch({
      "https://accounts.google.com/.well-known/openid-configuration":
        accountsGoogleOidc,
      "https://www.googleapis.com/oauth2/v3/certs": accountsGoogleJwks
    })

    const did = "did:jwks:accounts.google.com"
    const resolver = new Resolver(getResolver({ fetch: mockFetch }))
    const doc = await resolver.resolve(did)

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).not.toHaveBeenCalledWith(
      "https://accounts.google.com/.well-known/jwks.json",
      fetchInit
    )
    expectJwksDidDocument(did, doc.didDocument)
  })

  it("resolves did:jwks:token.actions.githubusercontent.com through discovery", async () => {
    const mockFetch = createMockFetch({
      "https://token.actions.githubusercontent.com/.well-known/openid-configuration":
        tokenActionsGitHubOidc,
      "https://token.actions.githubusercontent.com/.well-known/jwks":
        tokenActionsGitHubJwks
    })

    const did = "did:jwks:token.actions.githubusercontent.com"
    const resolver = new Resolver(getResolver({ fetch: mockFetch }))
    const doc = await resolver.resolve(did)

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expectJwksDidDocument(did, doc.didDocument)
  })

  it("resolves did:jwks:example.auth0.com through discovery", async () => {
    const mockFetch = createMockFetch({
      "https://example.auth0.com/.well-known/openid-configuration":
        exampleAuth0Oidc,
      "https://example.auth0.com/.well-known/jwks.json": exampleAuth0Jwks
    })

    const did = "did:jwks:example.auth0.com"
    const resolver = new Resolver(getResolver({ fetch: mockFetch }))
    const doc = await resolver.resolve(did)

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expectJwksDidDocument(did, doc.didDocument)
  })

  it("resolves a path DID through the direct path after a discovery 404", async () => {
    const mockFetch = createMockFetch({
      "https://auth.example.com/tenant123/jwks.json": { keys: [rsaKey] }
    })

    const did = "did:jwks:auth.example.com:tenant123"
    const resolver = new Resolver(getResolver({ fetch: mockFetch }))
    const doc = await resolver.resolve(did)

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "https://auth.example.com/.well-known/openid-configuration/tenant123",
      fetchInit
    )
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "https://auth.example.com/tenant123/jwks.json",
      fetchInit
    )
    expectJwksDidDocument(did, doc.didDocument)
  })

  it("returns notFound after a discovery 404 when jwksFallback is false", async () => {
    const mockFetch = createMockFetch({
      "https://auth.example.com/tenant123/jwks.json": { keys: [rsaKey] }
    })

    const resolver = new Resolver(
      getResolver({ fetch: mockFetch, jwksFallback: false })
    )
    const doc = await resolver.resolve("did:jwks:auth.example.com:tenant123")

    expect(doc.didDocument).toBeNull()
    expect(doc.didResolutionMetadata.error).toBe("notFound")
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("returns notFound when the discovery issuer does not match", async () => {
    const mockFetch = createMockFetch({
      "https://accounts.google.com/.well-known/openid-configuration": {
        ...accountsGoogleOidc,
        issuer: "https://evil.example"
      },
      "https://www.googleapis.com/oauth2/v3/certs": accountsGoogleJwks
    })

    const resolver = new Resolver(getResolver({ fetch: mockFetch }))
    const doc = await resolver.resolve("did:jwks:accounts.google.com")

    expect(doc.didDocument).toBeNull()
    expect(doc.didResolutionMetadata.error).toBe("notFound")
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("returns notFound when the key set is empty", async () => {
    const mockFetch = createMockFetch({
      "https://example.com/.well-known/jwks.json": { keys: [] }
    })

    const resolver = new Resolver(getResolver({ fetch: mockFetch }))
    const doc = await resolver.resolve("did:jwks:example.com")

    expect(doc.didDocument).toBeNull()
    expect(doc.didResolutionMetadata.error).toBe("notFound")
  })

  it("returns error when fetch throws an exception", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValue(
        new Error("Network timeout")
      ) as unknown as typeof globalThis.fetch

    const resolver = new Resolver(getResolver({ fetch: mockFetch }))
    const doc = await resolver.resolve("did:jwks:example.com")

    expect(doc.didDocument).toBeNull()
    expect(doc.didResolutionMetadata.error).toBe("internalError")
    expect(doc.didResolutionMetadata.message).toBe("Network timeout")
  })

  it("returns invalidDid when the DID names an invalid authority", async () => {
    const mockFetch = createMockFetch({})

    const resolver = new Resolver(getResolver({ fetch: mockFetch }))
    const doc = await resolver.resolve(
      "did:jwks:accounts.google.com%40evil.example"
    )

    expect(doc.didDocument).toBeNull()
    expect(doc.didResolutionMetadata.error).toBe("invalidDid")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("returns error when no JWKS found", async () => {
    const mockFetch = createMockFetch({})

    const resolver = new Resolver(getResolver({ fetch: mockFetch }))
    const doc = await resolver.resolve("did:jwks:example.com")

    expect(doc.didDocument).toBeNull()
    expect(doc.didResolutionMetadata.error).toBe("notFound")
    expect(doc.didResolutionMetadata.message).toBe("No JWKS found")
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
