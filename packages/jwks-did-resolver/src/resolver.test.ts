import { expect, describe, it, vi, afterEach } from "vitest"
import { getResolver } from "./resolver"
import { Resolver } from "did-resolver"
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
