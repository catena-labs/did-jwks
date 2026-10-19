import { afterEach, describe, expect, it, vi } from "vitest"
import type { Did } from "web-identity-schemas"

import { buildBaseUrl, InvalidDidError } from "./base-url"

describe("buildBaseUrl()", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each<[Did<"jwks">, string]>([
    ["did:jwks:example.com", "https://example.com"],
    ["did:jwks:example.com:user:alice", "https://example.com/user/alice"],
    ["did:jwks:EXAMPLE.com", "https://example.com"],
    ["did:jwks:example.com:v1.2", "https://example.com/v1.2"],
    ["did:jwks:example.com:foo%2Fbar", "https://example.com/foo%2Fbar"],
    ["did:jwks:example.com:a%3Fb%23c", "https://example.com/a%3Fb%23c"],
    ["did:jwks:example.com:a%25b%5Cc", "https://example.com/a%25b%5Cc"],
    ["did:jwks:example.com:%40alice", "https://example.com/@alice"],
    ["did:jwks:example.com:a%3Ab", "https://example.com/a:b"],
    ["did:jwks:example.com:a:.%09.:b", "https://example.com/a/.%09./b"],
    ["did:jwks:example.com:a%0Ab%20c", "https://example.com/a%0Ab%20c"],
    ["did:jwks:example.com:b%C3%BCcher", "https://example.com/b%C3%BCcher"]
  ])("builds %s as %s", (did, expected) => {
    expect(buildBaseUrl(did)).toBe(expected)
  })

  it("normalizes a port on an allowed http host", () => {
    expect(buildBaseUrl("did:jwks:localhost%3A09200", ["localhost"])).toBe(
      "http://localhost:9200"
    )
  })

  it("drops the default port on an allowed http host", () => {
    expect(buildBaseUrl("did:jwks:localhost%3A80", ["localhost"])).toBe(
      "http://localhost"
    )
  })

  it.each<[string, Did<"jwks">]>([
    ["an IPv4 literal", "did:jwks:169.254.169.254"],
    ["a hex IPv4 literal", "did:jwks:0x7f.0.0.0x1"],
    ["a trailing-dot host", "did:jwks:example.com."],
    ["userinfo", "did:jwks:good.com%40evil.com"],
    ["a query marker", "did:jwks:example.com%3Fa=b"],
    ["a fragment marker", "did:jwks:example.com%23x"],
    ["an empty authority", "did:jwks:"],
    ["a port on a host that is not allowed", "did:jwks:example.com%3A8443"],
    ["an empty path segment", "did:jwks:example.com::admin"],
    ["a trailing colon", "did:jwks:example.com:user:"],
    ["a lone surrogate", "did:jwks:example.com:\uD800"],
    ["a single dot segment", "did:jwks:example.com:."],
    ["a double dot segment", "did:jwks:example.com:a:..:b"],
    ["an encoded dot segment", "did:jwks:example.com:a:%2E%2E:b"],
    ["malformed percent-encoding", "did:jwks:example.com:%E0%A4%A"]
  ])("rejects %s", (_, did) => {
    expect(() => buildBaseUrl(did)).toThrow(InvalidDidError)
  })

  it("rejects a host that the URL parser cannot parse", () => {
    vi.spyOn(URL, "canParse").mockReturnValue(false)

    expect(() => buildBaseUrl("did:jwks:example.com")).toThrow(InvalidDidError)
  })

  it.each(["0", "65536", "99999"])("rejects port %s", (port) => {
    expect(() =>
      buildBaseUrl(`did:jwks:localhost%3A${port}`, ["localhost"])
    ).toThrow(InvalidDidError)
  })
})
