import { describe, expect, it } from "vitest"
import type { Did } from "web-identity-schemas"

import { buildBaseUrl, InvalidDidError } from "./base-url"

describe("buildBaseUrl()", () => {
  it.each<[Did<"jwks">, string]>([
    ["did:jwks:example.com", "https://example.com"],
    ["did:jwks:example.com:user:alice", "https://example.com/user/alice"],
    ["did:jwks:example.com:user:", "https://example.com/user"],
    ["did:jwks:example.com:v1.2", "https://example.com/v1.2"],
    ["did:jwks:example.com:foo%2Fbar", "https://example.com/foo%2Fbar"]
  ])("builds %s as %s", (did, expected) => {
    expect(buildBaseUrl(did)).toBe(expected)
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
    ["a single dot segment", "did:jwks:example.com:."],
    ["a double dot segment", "did:jwks:example.com:a:..:b"],
    ["an encoded dot segment", "did:jwks:example.com:a:%2E%2E:b"],
    ["malformed percent-encoding", "did:jwks:example.com:%E0%A4%A"]
  ])("rejects %s", (_, did) => {
    expect(() => buildBaseUrl(did)).toThrow(InvalidDidError)
  })
})
