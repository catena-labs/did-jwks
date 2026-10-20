import type { JsonWebKey } from "web-identity-schemas"

/**
 * Asymmetric JWK private parameters (RFC 7517 / RFC 7518).
 * These must never appear in a DID document's publicKeyJwk.
 */
const JWK_PRIVATE_PARAMETERS = [
  "d",
  "p",
  "q",
  "dp",
  "dq",
  "qi",
  "oth"
] as const

/**
 * Return a shallow copy of a JWK with private key parameters removed.
 * Public metadata (kid, use, alg, key_ops, x5c, …) is preserved.
 */
export function toPublicJwk(jwk: JsonWebKey): JsonWebKey {
  const publicJwk = { ...jwk }

  for (const parameter of JWK_PRIVATE_PARAMETERS) {
    delete (publicJwk as Record<string, unknown>)[parameter]
  }

  return publicJwk
}
