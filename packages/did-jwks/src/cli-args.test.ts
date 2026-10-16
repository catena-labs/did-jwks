import { describe, expect, it } from "vitest"

import { parseCliArgs } from "./cli-args"

describe("parseCliArgs()", () => {
  it("parses a DID with strict resolution", () => {
    expect(parseCliArgs(["did:jwks:example.com"])).toEqual({
      did: "did:jwks:example.com",
      discovery: false
    })
  })

  it("parses the --discovery flag", () => {
    expect(
      parseCliArgs(["--discovery", "did:jwks:accounts.google.com"])
    ).toEqual({ did: "did:jwks:accounts.google.com", discovery: true })
  })

  it("accepts the --discovery flag after the DID", () => {
    expect(
      parseCliArgs(["did:jwks:accounts.google.com", "--discovery"])
    ).toEqual({ did: "did:jwks:accounts.google.com", discovery: true })
  })

  it("ignores a leading -- separator", () => {
    expect(parseCliArgs(["--", "did:jwks:example.com"])).toEqual({
      did: "did:jwks:example.com",
      discovery: false
    })
  })

  it.each([
    ["no arguments", []],
    ["two DIDs", ["did:jwks:a.com", "did:jwks:b.com"]],
    ["an unknown flag", ["--fallback", "did:jwks:example.com"]]
  ])("returns null for %s", (_description, args) => {
    expect(parseCliArgs(args)).toBeNull()
  })
})
