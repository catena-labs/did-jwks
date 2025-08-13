import { describe, it, expect } from "vitest"
import { generateJwkThumbprint } from "./jwk-thumbprint"

describe("generateJwkThumbprint()", () => {
  it("generates consistent thumbprints for RSA keys", async () => {
    const jwk = {
      kty: "RSA" as const,
      use: "sig" as const,
      kid: "test-key",
      n: "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISO6B-ZQaZ-c2dHzlg_c_NV3W_CFD2Xd2HlEHfnN6HwsRLd1aV7LHcU0-8vBwPyQW9Y9X8k_D-3k9r0B9R4QQH_cJ1nZK6iGv9Q",
      e: "AQAB"
    }

    const thumbprint1 = await generateJwkThumbprint(jwk)
    const thumbprint2 = await generateJwkThumbprint(jwk)

    expect(thumbprint1).toBe(thumbprint2)
    expect(thumbprint1).toMatch(/^[A-Za-z0-9_-]+$/) // base64url format
    expect(thumbprint1.length).toBeGreaterThan(20) // reasonable length
  })

  it("generates different thumbprints for different keys", async () => {
    const jwk1 = {
      kty: "RSA" as const,
      n: "key1-n-value",
      e: "AQAB"
    }

    const jwk2 = {
      kty: "RSA" as const,
      n: "key2-n-value",
      e: "AQAB"
    }

    const thumbprint1 = await generateJwkThumbprint(jwk1)
    const thumbprint2 = await generateJwkThumbprint(jwk2)

    expect(thumbprint1).not.toBe(thumbprint2)
  })

  it("ignores non-required parameters in thumbprint", async () => {
    const jwkMinimal = {
      kty: "RSA" as const,
      n: "test-n",
      e: "AQAB"
    }

    const jwkWithExtras = {
      kty: "RSA" as const,
      use: "sig" as const,
      kid: "test-key",
      alg: "RS256" as const,
      n: "test-n",
      e: "AQAB"
    }

    const thumbprint1 = await generateJwkThumbprint(jwkMinimal)
    const thumbprint2 = await generateJwkThumbprint(jwkWithExtras)

    expect(thumbprint1).toBe(thumbprint2)
  })
})
