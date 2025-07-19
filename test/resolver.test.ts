import { describe, it, expect, beforeEach, mock } from "bun:test"
import { Resolver } from "did-resolver"
import type { DIDResolutionResult } from "did-resolver"
import { getResolver } from "../src/resolver"
import type { Did } from "web-identity-schemas"
import accountsGoogleOidc from "./fixtures/accounts-google-oidc.json"
import accountsGoogleJwks from "./fixtures/accounts-google-jwks.json"
import type { OpenIDConfiguration } from "../src/schemas"
import appleidAppleOidc from "./fixtures/appleid-apple-oidc.json"
import appleidAppleJwks from "./fixtures/appleid-apple-jwks.json"
import tokenActionsGitHubJwks from "./fixtures/token-actions-githubusercontent-jwks.json"

describe("did-jwks-resolver", () => {
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
    const didJwksResolver = getResolver({
      fetch: mockFetch,
      allowedHttpHosts: ["localhost"]
    })
    const resolver = new Resolver(didJwksResolver)

    const did = "did:jwks:localhost%3A3000"
    const doc = await resolver.resolve(did)

    // Verify the fetch was called with the expected URL
    expect(mockFetch).toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/.well-known/jwks.json"
    )
    expectDidJwksDocument(did, doc)
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
    const didJwksResolver = getResolver({
      fetch: mockFetch,
      allowedHttpHosts: ["localhost"]
    })
    const resolver = new Resolver(didJwksResolver)

    const did = "did:jwks:localhost%3A3000:user:alice"
    const doc = await resolver.resolve(did)

    // Verify the fetch was called with the expected URL
    expect(mockFetch).toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/user/alice/.well-known/jwks.json"
    )
    expectDidJwksDocument(did, doc)
  })

  it("resolves did:jwks:accounts.google.com", async () => {
    const mockFetch = createMockOidcHost({
      jwks: accountsGoogleJwks,
      oidc: accountsGoogleOidc
    })

    const didJwksResolver = getResolver({
      fetch: mockFetch
    })
    const resolver = new Resolver(didJwksResolver)
    const did = "did:jwks:accounts.google.com"
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
    expectDidJwksDocument(did, doc)
  })

  it("resolves did:jwks:appleid.apple.com", async () => {
    const mockFetch = createMockOidcHost({
      jwks: appleidAppleJwks,
      oidc: appleidAppleOidc
    })
    const didJwksResolver = getResolver({
      fetch: mockFetch
    })
    const resolver = new Resolver(didJwksResolver)

    const did = "did:jwks:appleid.apple.com"
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
    expectDidJwksDocument(did, doc)
  })

  it("resolves did:jwks:token.actions.githubusercontent.com", async () => {
    const mockFetch = mockFetchFn(tokenActionsGitHubJwks)

    const didJwksResolver = getResolver({
      fetch: mockFetch
    })
    const resolver = new Resolver(didJwksResolver)

    const did = "did:jwks:token.actions.githubusercontent.com"
    const doc = await resolver.resolve(did)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      "https://token.actions.githubusercontent.com/.well-known/jwks.json"
    )
    expectDidJwksDocument(did, doc)
  })

  it("returns error when no JWKS found", async () => {
    const mockFetch = mockFetchFn({})
    const didJwksResolver = getResolver({
      fetch: mockFetch,
      allowedHttpHosts: ["localhost"]
    })
    const resolver = new Resolver(didJwksResolver)

    const did = "did:jwks:example.com"
    const doc = await resolver.resolve(did)

    expect(doc.didDocument).toBeNull()
    expect(doc.didResolutionMetadata.error).toBe("notFound")
    expect(doc.didResolutionMetadata.message).toBe("No JWKS found")
  })
})

function expectDidJwksDocument(didUri: Did<"jwks">, doc: DIDResolutionResult) {
  expect(doc.didResolutionMetadata.error).toBeUndefined()
  expect(doc.didDocument).toBeDefined()
  expect(doc.didDocument).toMatchObject({
    "@context": ["https://www.w3.org/ns/did/v1"],
    id: didUri
  })

  // Check that verificationMethod is an array of VerificationMethod type
  expect(doc.didDocument?.verificationMethod).toBeInstanceOf(Array)
  expect(doc.didDocument?.verificationMethod!.length).toBeGreaterThan(0)

  // Type check each verification method using runtime property checks
  const verificationMethods = doc.didDocument?.verificationMethod
  verificationMethods?.forEach((vm) => {
    // Check that vm has the required properties of VerificationMethod
    expect(vm).toHaveProperty("id")
    expect(vm).toHaveProperty("type")
    expect(vm).toHaveProperty("controller")
    expect(vm).toHaveProperty("publicKeyJwk")

    // Check specific property types and values
    expect(typeof vm.id).toBe("string")
    expect(typeof vm.type).toBe("string")
    expect(typeof vm.controller).toBe("string")
    expect(typeof vm.publicKeyJwk).toBe("object")

    // Check the structure matches VerificationMethod interface
    expect(vm).toMatchObject({
      id: expect.stringMatching(new RegExp(`^${didUri}#`)),
      type: "JsonWebKey",
      controller: didUri,
      publicKeyJwk: expect.objectContaining({
        alg: expect.any(String),
        e: expect.any(String),
        kty: expect.any(String),
        n: expect.any(String)
      })
    })
  })

  // Check assertion and authentication methods reference the verification methods
  expect(doc.didDocument?.assertionMethod).toEqual(
    verificationMethods?.map((vm) => vm.id) ?? []
  )
  expect(doc.didDocument?.authentication).toEqual(
    verificationMethods?.map((vm) => vm.id) ?? []
  )
  expect(doc.didDocument?.id).toBe(didUri)
}

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
