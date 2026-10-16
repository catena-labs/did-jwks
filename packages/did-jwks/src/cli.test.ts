import { describe, it, expect } from "vitest"

import { DEFAULT_ALLOWED_HTTP_HOSTS, parseArgs } from "./cli"

describe("parseArgs()", () => {
  it("parses a bare DID with default hosts", () => {
    const args = parseArgs(["did:jwks:example.com"], {})
    expect(args.did).toBe("did:jwks:example.com")
    expect(args.help).toBe(false)
    expect(args.invalid).toBe(false)
    expect(args.allowedHttpHosts).toEqual(DEFAULT_ALLOWED_HTTP_HOSTS)
  })

  it("strips a lone pnpm -- separator", () => {
    const args = parseArgs(["--", "did:jwks:example.com"], {})
    expect(args.did).toBe("did:jwks:example.com")
    expect(args.invalid).toBe(false)
  })

  it("recognizes --help and -h", () => {
    expect(parseArgs(["--help"], {}).help).toBe(true)
    expect(parseArgs(["-h"], {}).help).toBe(true)
  })

  it("collects --allow-http hosts without duplicates", () => {
    const args = parseArgs(
      ["--allow-http=example.com, localhost", "did:jwks:example.com"],
      {}
    )
    expect(args.did).toBe("did:jwks:example.com")
    expect(args.invalid).toBe(false)
    expect(args.allowedHttpHosts).toContain("example.com")
    expect(args.allowedHttpHosts).toContain("localhost")
    expect(
      args.allowedHttpHosts.filter((host) => host === "localhost")
    ).toHaveLength(1)
  })

  it("merges DID_JWKS_ALLOW_HTTP_HOSTS env hosts", () => {
    const args = parseArgs(["did:jwks:example.com"], {
      DID_JWKS_ALLOW_HTTP_HOSTS: "test.local, 127.0.0.1"
    })
    expect(args.allowedHttpHosts).toContain("test.local")
    expect(args.allowedHttpHosts).toContain("127.0.0.1")
    expect(args.invalid).toBe(false)
  })

  it("flags unknown options and extra positionals as invalid", () => {
    expect(parseArgs(["--bogus", "did:jwks:example.com"], {}).invalid).toBe(
      true
    )
    expect(parseArgs(["did:jwks:a.com", "did:jwks:b.com"], {}).invalid).toBe(
      true
    )
    expect(parseArgs([], {}).did).toBeUndefined()
  })
})
