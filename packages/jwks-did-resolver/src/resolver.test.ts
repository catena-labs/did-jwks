import {
  createMockFetch,
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
import tokenActionsGitHubOidc from "@repo/test-utils/fixtures/token-actions-githubusercontent-oidc.json"
import { Resolver } from "did-resolver"
import { expect, describe, it, vi, afterEach } from "vitest"

import { getResolver } from "./resolver"

describe("Resolver", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns notFound for did:jwks:accounts.google.com without opt-in discovery", async () => {
    const mockFetch = createMockOidcHost({
      jwks: accountsGoogleJwks,
      oidc: accountsGoogleOidc
    })

    const did = "did:jwks:accounts.google.com"
    const resolver = new Resolver(getResolver({ fetch: mockFetch }))
    const doc = await resolver.resolve(did)

    expect(doc.didDocument).toBeNull()
    expect(doc.didResolutionMetadata.error).toBe("notFound")
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      "https://accounts.google.com/.well-known/jwks.json"
    )
  })

  it("returns notFound for did:jwks:appleid.apple.com without opt-in discovery", async () => {
    const mockFetch = createMockOidcHost({
      jwks: appleidAppleJwks,
      oidc: appleidAppleOidc
    })

    const did = "did:jwks:appleid.apple.com"
    const resolver = new Resolver(getResolver({ fetch: mockFetch }))
    const doc = await resolver.resolve(did)

    expect(doc.didDocument).toBeNull()
    expect(doc.didResolutionMetadata.error).toBe("notFound")
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      "https://appleid.apple.com/.well-known/jwks.json"
    )
  })

  it("resolves did:jwks:accounts.google.com with opt-in discovery", async () => {
    const mockFetch = createMockFetch({
      "https://accounts.google.com/.well-known/openid-configuration":
        accountsGoogleOidc,
      "https://www.googleapis.com/oauth2/v3/certs": accountsGoogleJwks
    })

    const did = "did:jwks:accounts.google.com"
    const resolver = new Resolver(
      getResolver({ fetch: mockFetch, discoveryDids: [did] })
    )
    const doc = await resolver.resolve(did)

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).not.toHaveBeenCalledWith(
      "https://accounts.google.com/.well-known/jwks.json"
    )
    expectJwksDidDocument(did, doc.didDocument)
  })

  it("resolves did:jwks:token.actions.githubusercontent.com with opt-in discovery", async () => {
    const mockFetch = createMockFetch({
      "https://token.actions.githubusercontent.com/.well-known/openid-configuration":
        tokenActionsGitHubOidc,
      "https://token.actions.githubusercontent.com/.well-known/jwks":
        tokenActionsGitHubJwks
    })

    const did = "did:jwks:token.actions.githubusercontent.com"
    const resolver = new Resolver(
      getResolver({ fetch: mockFetch, discoveryDids: [did] })
    )
    const doc = await resolver.resolve(did)

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expectJwksDidDocument(did, doc.didDocument)
  })

  it("returns notFound when the discovery issuer does not match", async () => {
    const mockFetch = createMockFetch({
      "https://accounts.google.com/.well-known/openid-configuration": {
        ...accountsGoogleOidc,
        issuer: "https://evil.example"
      },
      "https://www.googleapis.com/oauth2/v3/certs": accountsGoogleJwks
    })

    const did = "did:jwks:accounts.google.com"
    const resolver = new Resolver(
      getResolver({ fetch: mockFetch, discoveryDids: [did] })
    )
    const doc = await resolver.resolve(did)

    expect(doc.didDocument).toBeNull()
    expect(doc.didResolutionMetadata.error).toBe("notFound")
    expect(mockFetch).toHaveBeenCalledTimes(1)
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

  it("returns error when fetch throws an exception", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValue(
        new Error("Network timeout")
      ) as unknown as typeof globalThis.fetch

    const did = "did:jwks:example.com"
    const resolver = new Resolver(getResolver({ fetch: mockFetch }))
    const doc = await resolver.resolve(did)

    expect(doc.didDocument).toBeNull()
    expect(doc.didResolutionMetadata.error).toBe("internalError")
    expect(doc.didResolutionMetadata.message).toBe("Network timeout")
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
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
