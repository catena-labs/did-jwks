import { describe, expect, it } from "vitest"

import { parseCliArgs } from "./cli-args"

describe("parseCliArgs()", () => {
  it("parses a DID with the jwks.json fallback on", () => {
    expect(parseCliArgs(["did:jwks:example.com"])).toEqual({
      did: "did:jwks:example.com",
      jwksFallback: true
    })
  })

  it("parses the --no-fallback flag", () => {
    expect(parseCliArgs(["--no-fallback", "did:jwks:example.com"])).toEqual({
      did: "did:jwks:example.com",
      jwksFallback: false
    })
  })

  it("accepts the --no-fallback flag after the DID", () => {
    expect(parseCliArgs(["did:jwks:example.com", "--no-fallback"])).toEqual({
      did: "did:jwks:example.com",
      jwksFallback: false
    })
  })

  it("ignores a leading -- separator", () => {
    expect(parseCliArgs(["--", "did:jwks:example.com"])).toEqual({
      did: "did:jwks:example.com",
      jwksFallback: true
    })
  })

  it.each([
    ["no arguments", []],
    ["two DIDs", ["did:jwks:a.com", "did:jwks:b.com"]],
    ["an unknown flag", ["--discovery", "did:jwks:example.com"]]
  ])("returns null for %s", (_description, args) => {
    expect(parseCliArgs(args)).toBeNull()
  })
})
