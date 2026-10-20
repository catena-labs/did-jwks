import { describe, it, expect } from "vitest"
import type { Did } from "web-identity-schemas"

import { createDidJwksDidDocument } from "./did-jwks"

describe("createDidJwksDidDocument()", () => {
  it("strips asymmetric private JWK parameters from publicKeyJwk", async () => {
    const did = "did:jwks:example.com" as Did<"jwks">
    const privateRsaKey = {
      kty: "RSA" as const,
      use: "sig" as const,
      kid: "key-1",
      alg: "RS256" as const,
      n: "test-n-value",
      e: "AQAB",
      d: "private-d",
      p: "private-p",
      q: "private-q",
      dp: "private-dp",
      dq: "private-dq",
      qi: "private-qi"
    }

    const doc = await createDidJwksDidDocument(did, {
      keys: [privateRsaKey]
    })

    expect(doc.verificationMethod).toHaveLength(1)
    expect(doc.verificationMethod?.[0]).toMatchObject({
      publicKeyJwk: {
        kty: "RSA",
        use: "sig",
        kid: "key-1",
        alg: "RS256",
        n: "test-n-value",
        e: "AQAB"
      }
    })

    const serialized = JSON.stringify(doc.verificationMethod?.[0])
    for (const secret of [
      "private-d",
      "private-p",
      "private-q",
      "private-dp",
      "private-dq",
      "private-qi"
    ]) {
      expect(serialized).not.toContain(secret)
    }

    // Input JWKS must not be mutated
    expect(privateRsaKey.d).toBe("private-d")
    expect(privateRsaKey.p).toBe("private-p")
  })

  it("strips EC private parameter d while preserving public members", async () => {
    const did = "did:jwks:example.com" as Did<"jwks">
    const privateEcKey = {
      kty: "EC" as const,
      use: "sig" as const,
      crv: "P-256" as const,
      x: "test-x",
      y: "test-y",
      d: "private-d"
    }

    const doc = await createDidJwksDidDocument(did, {
      keys: [privateEcKey]
    })

    expect(doc.verificationMethod?.[0]).toMatchObject({
      publicKeyJwk: {
        kty: "EC",
        use: "sig",
        crv: "P-256",
        x: "test-x",
        y: "test-y"
      }
    })
    expect(JSON.stringify(doc.verificationMethod?.[0])).not.toContain(
      "private-d"
    )
    expect(privateEcKey.d).toBe("private-d")
  })
})
