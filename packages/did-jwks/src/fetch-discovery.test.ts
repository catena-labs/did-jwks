import { createMockFetch, fetchInit } from "@repo/test-utils"
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

const did = "did:jwks:example.com"
const discoveryUrl = "https://example.com/.well-known/openid-configuration"
const fixedJwksUrl = "https://example.com/.well-known/jwks.json"
const jwksUri = "https://keys.example.com/jwks"
const discovery = { issuer: "https://example.com", jwks_uri: jwksUri }

describe("fetchJwksDidDocument() discovery-first resolution", () => {
  it("uses only the jwks_uri key set when a discovery document exists", async () => {
    const mockFetch = createMockFetch({
      [discoveryUrl]: discovery,
      [jwksUri]: { keys: [rsaKey("discovered")] },
      [fixedJwksUrl]: { keys: [rsaKey("fixed")] }
    })

    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(keyIds(doc)).toEqual(["discovered"])
    expect(mockFetch).not.toHaveBeenCalledWith(fixedJwksUrl, fetchInit)
  })

  it("falls back to jwks.json when the discovery document returns 404", async () => {
    const mockFetch = createMockFetch({
      [fixedJwksUrl]: { keys: [rsaKey("fixed")] }
    })

    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(keyIds(doc)).toEqual(["fixed"])
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenNthCalledWith(1, discoveryUrl, fetchInit)
    expect(mockFetch).toHaveBeenNthCalledWith(2, fixedJwksUrl, fetchInit)
  })

  it.each([400, 401, 403, 410, 500, 503])(
    "does not fall back when the discovery document returns %i",
    async (status) => {
      const mockFetch = createMockFetch({
        [discoveryUrl]: status,
        [fixedJwksUrl]: { keys: [rsaKey("fixed")] }
      })

      const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

      expect(doc).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    }
  )

  it("does not fall back when the discovery document is not JSON", async () => {
    const mockFetch = vi.fn((url: string) =>
      Promise.resolve(
        url === discoveryUrl
          ? {
              ok: true,
              status: 200,
              json: () => Promise.reject(new SyntaxError("Unexpected token <"))
            }
          : {
              ok: true,
              status: 200,
              json: () => Promise.resolve({ keys: [rsaKey("fixed")] })
            }
      )
    ) as unknown as typeof globalThis.fetch

    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(doc).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["no issuer", { jwks_uri: jwksUri }],
    ["no jwks_uri", { issuer: "https://example.com" }],
    ["an invalid jwks_uri", { issuer: "https://example.com", jwks_uri: "x" }]
  ])(
    "does not fall back when the discovery document has %s",
    async (_description, document) => {
      const mockFetch = createMockFetch({
        [discoveryUrl]: document,
        [jwksUri]: { keys: [rsaKey("discovered")] },
        [fixedJwksUrl]: { keys: [rsaKey("fixed")] }
      })

      const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

      expect(doc).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    }
  )

  it.each([
    ["a different origin", "https://evil.example"],
    ["a different scheme", "http://example.com"],
    ["a different case", "https://EXAMPLE.com"],
    ["a path", "https://example.com/tenant"],
    ["two trailing slashes", "https://example.com//"]
  ])(
    "does not fall back when the issuer has %s",
    async (_description, issuer) => {
      const mockFetch = createMockFetch({
        [discoveryUrl]: { issuer, jwks_uri: jwksUri },
        [jwksUri]: { keys: [rsaKey("discovered")] },
        [fixedJwksUrl]: { keys: [rsaKey("fixed")] }
      })

      const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

      expect(doc).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    }
  )

  it("accepts an issuer with one terminating slash (RFC 8414 section 3.1)", async () => {
    const mockFetch = createMockFetch({
      [discoveryUrl]: { issuer: "https://example.com/", jwks_uri: jwksUri },
      [jwksUri]: { keys: [rsaKey("discovered")] }
    })

    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(keyIds(doc)).toEqual(["discovered"])
  })

  it("does not fall back when the jwks_uri returns 404", async () => {
    const mockFetch = createMockFetch({
      [discoveryUrl]: discovery,
      [fixedJwksUrl]: { keys: [rsaKey("fixed")] }
    })

    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(doc).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).not.toHaveBeenCalledWith(fixedJwksUrl, fetchInit)
  })

  it("does not fall back when the jwks_uri document is malformed", async () => {
    const mockFetch = createMockFetch({
      [discoveryUrl]: discovery,
      [jwksUri]: { keys: "not-an-array" },
      [fixedJwksUrl]: { keys: [rsaKey("fixed")] }
    })

    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(doc).toBeNull()
    expect(mockFetch).not.toHaveBeenCalledWith(fixedJwksUrl, fetchInit)
  })

  it("does not fall back when the jwks_uri key set is empty", async () => {
    const mockFetch = createMockFetch({
      [discoveryUrl]: discovery,
      [jwksUri]: { keys: [] },
      [fixedJwksUrl]: { keys: [rsaKey("fixed")] }
    })

    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(doc).toBeNull()
    expect(mockFetch).not.toHaveBeenCalledWith(fixedJwksUrl, fetchInit)
  })

  it("returns null when the fallback key set is empty", async () => {
    const mockFetch = createMockFetch({
      [fixedJwksUrl]: { keys: [] }
    })

    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(doc).toBeNull()
  })

  it("rejects without a fallback when discovery has a network error", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValue(
        new TypeError("fetch failed")
      ) as unknown as typeof globalThis.fetch

    await expect(
      fetchJwksDidDocument(did, { fetch: mockFetch })
    ).rejects.toThrow("fetch failed")
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(discoveryUrl, fetchInit)
  })

  it("allows a cross-origin https jwks_uri", async () => {
    const mockFetch = createMockFetch({
      [discoveryUrl]: discovery,
      [jwksUri]: { keys: [rsaKey("discovered")] }
    })

    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(keyIds(doc)).toEqual(["discovered"])
  })

  it("does not fall back when the jwks_uri does not use https", async () => {
    const insecureJwksUri = "http://keys.example.com/jwks"
    const mockFetch = createMockFetch({
      [discoveryUrl]: {
        issuer: "https://example.com",
        jwks_uri: insecureJwksUri
      },
      [insecureJwksUri]: { keys: [rsaKey("discovered")] },
      [fixedJwksUrl]: { keys: [rsaKey("fixed")] }
    })

    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(doc).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["a username", "https://good.example@keys.example.com/jwks"],
    ["a username and password", "https://user:pass@keys.example.com/jwks"]
  ])(
    "does not fall back when the jwks_uri carries %s",
    async (_description, userinfoJwksUri) => {
      const mockFetch = createMockFetch({
        [discoveryUrl]: {
          issuer: "https://example.com",
          jwks_uri: userinfoJwksUri
        },
        [userinfoJwksUri]: { keys: [rsaKey("discovered")] },
        [fixedJwksUrl]: { keys: [rsaKey("fixed")] }
      })

      const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

      expect(doc).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    }
  )

  it("does not fall back when the jwks_uri uses another scheme", async () => {
    const mockFetch = createMockFetch({
      [discoveryUrl]: {
        issuer: "https://example.com",
        jwks_uri: "file:///etc/jwks.json"
      },
      [fixedJwksUrl]: { keys: [rsaKey("fixed")] }
    })

    const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

    expect(doc).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("rejects an http jwks_uri on an allowed http host for an https identity", async () => {
    const localJwksUri = "http://localhost/keys"
    const mockFetch = createMockFetch({
      [discoveryUrl]: { issuer: "https://example.com", jwks_uri: localJwksUri },
      [localJwksUri]: { keys: [rsaKey("discovered")] }
    })

    const doc = await fetchJwksDidDocument(did, {
      fetch: mockFetch,
      allowedHttpHosts: ["localhost"]
    })

    expect(doc).toBeNull()
    expect(mockFetch).not.toHaveBeenCalledWith(localJwksUri, fetchInit)
  })

  it("allows an http jwks_uri for an http identity on an allowed http host", async () => {
    const localJwksUri = "http://localhost:3000/keys"
    const mockFetch = createMockFetch({
      "http://localhost:3000/.well-known/openid-configuration": {
        issuer: "http://localhost:3000",
        jwks_uri: localJwksUri
      },
      [localJwksUri]: { keys: [rsaKey("discovered")] }
    })

    const doc = await fetchJwksDidDocument("did:jwks:localhost%3A3000", {
      fetch: mockFetch,
      allowedHttpHosts: ["localhost"]
    })

    expect(keyIds(doc)).toEqual(["discovered"])
  })

  describe("redirects", () => {
    function mockRedirectFetch(redirects: Record<string, string>) {
      return vi.fn((url: string) => {
        const landedUrl = redirects[url] ?? url
        const bodies: Record<string, object> = {
          [discoveryUrl]: discovery,
          [jwksUri]: { keys: [rsaKey("discovered")] },
          [fixedJwksUrl]: { keys: [rsaKey("fixed")] }
        }
        const body = bodies[url]
        return Promise.resolve(
          body === undefined
            ? { ok: false, status: 404, url: landedUrl }
            : {
                ok: true,
                status: 200,
                url: landedUrl,
                json: () => Promise.resolve(body)
              }
        )
      }) as unknown as typeof globalThis.fetch
    }

    it("does not fall back when the discovery document redirects to http", async () => {
      const mockFetch = mockRedirectFetch({
        [discoveryUrl]: "http://example.com/.well-known/openid-configuration"
      })

      const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

      expect(doc).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("does not fall back when the discovery document redirects through an http hop", async () => {
      const httpHop = "http://example.com/hop"
      const mockFetch = vi.fn((url: string) =>
        Promise.resolve(
          url === discoveryUrl
            ? new Response(null, {
                status: 302,
                headers: { location: httpHop }
              })
            : new Response(null, {
                status: 302,
                headers: { location: "https://attacker.example/discovery" }
              })
        )
      ) as unknown as typeof globalThis.fetch

      const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

      expect(doc).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).not.toHaveBeenCalledWith(httpHop, fetchInit)
    })

    it("does not fall back when a fetch that followed redirects returns the discovery 404", async () => {
      const mockFetch = vi.fn((url: string) =>
        Promise.resolve(
          url === discoveryUrl
            ? { ok: false, status: 404, redirected: true, url }
            : {
                ok: true,
                status: 200,
                url,
                json: () => Promise.resolve({ keys: [rsaKey("fixed")] })
              }
        )
      ) as unknown as typeof globalThis.fetch

      const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

      expect(doc).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("returns null when the jwks_uri redirects to http", async () => {
      const mockFetch = mockRedirectFetch({
        [jwksUri]: "http://keys.example.com/jwks"
      })

      const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

      expect(doc).toBeNull()
    })

    it("returns null when the fallback JWKS redirects to http", async () => {
      const mockFetch = createMockFetch({})
      const redirectFetch = vi.fn((url: string) =>
        url === fixedJwksUrl
          ? Promise.resolve({
              ok: true,
              status: 200,
              url: "http://example.com/.well-known/jwks.json",
              json: () => Promise.resolve({ keys: [rsaKey("fixed")] })
            })
          : mockFetch(url)
      ) as unknown as typeof globalThis.fetch

      const doc = await fetchJwksDidDocument(did, { fetch: redirectFetch })

      expect(doc).toBeNull()
    })

    it("follows a redirect to another https URL", async () => {
      const mockFetch = mockRedirectFetch({
        [jwksUri]: "https://cdn.example.com/jwks"
      })

      const doc = await fetchJwksDidDocument(did, { fetch: mockFetch })

      expect(keyIds(doc)).toEqual(["discovered"])
    })
  })

  describe("path DIDs", () => {
    const pathDid = "did:jwks:auth.example.com:tenant123"
    const insertionForm =
      "https://auth.example.com/.well-known/openid-configuration/tenant123"
    const appendForm =
      "https://auth.example.com/tenant123/.well-known/openid-configuration"
    const pathFixedJwks = "https://auth.example.com/tenant123/jwks.json"
    const pathJwksUri = "https://auth.example.com/tenant123/keys"

    it("uses the RFC 8414 insertion form and requires the path in issuer", async () => {
      const mockFetch = createMockFetch({
        [insertionForm]: {
          issuer: "https://auth.example.com/tenant123",
          jwks_uri: pathJwksUri
        },
        [pathJwksUri]: { keys: [rsaKey("discovered")] }
      })

      const doc = await fetchJwksDidDocument(pathDid, { fetch: mockFetch })

      expect(keyIds(doc)).toEqual(["discovered"])
      expect(mockFetch).toHaveBeenNthCalledWith(1, insertionForm, fetchInit)
    })

    it("does not fall back when the issuer is the origin only", async () => {
      const mockFetch = createMockFetch({
        [insertionForm]: {
          issuer: "https://auth.example.com",
          jwks_uri: pathJwksUri
        },
        [pathJwksUri]: { keys: [rsaKey("discovered")] },
        [pathFixedJwks]: { keys: [rsaKey("fixed")] }
      })

      const doc = await fetchJwksDidDocument(pathDid, { fetch: mockFetch })

      expect(doc).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("never reads the path-append form", async () => {
      const mockFetch = createMockFetch({
        [appendForm]: {
          issuer: "https://auth.example.com/tenant123",
          jwks_uri: pathJwksUri
        },
        [pathJwksUri]: { keys: [rsaKey("discovered")] },
        [pathFixedJwks]: { keys: [rsaKey("fixed")] }
      })

      const doc = await fetchJwksDidDocument(pathDid, { fetch: mockFetch })

      expect(keyIds(doc)).toEqual(["fixed"])
      expect(mockFetch).not.toHaveBeenCalledWith(appendForm, fetchInit)
    })
  })
})

describe("fetchJwksDidDocument() with jwksFallback: false", () => {
  it("returns null without reading jwks.json after a discovery 404", async () => {
    const mockFetch = createMockFetch({
      [fixedJwksUrl]: { keys: [rsaKey("fixed")] }
    })

    const doc = await fetchJwksDidDocument(did, {
      fetch: mockFetch,
      jwksFallback: false
    })

    expect(doc).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(discoveryUrl, fetchInit)
  })

  it("still resolves through a valid discovery document", async () => {
    const mockFetch = createMockFetch({
      [discoveryUrl]: discovery,
      [jwksUri]: { keys: [rsaKey("discovered")] }
    })

    const doc = await fetchJwksDidDocument(did, {
      fetch: mockFetch,
      jwksFallback: false
    })

    expect(keyIds(doc)).toEqual(["discovered"])
  })
})
