import type { JsonWebKey } from "web-identity-schemas"

/**
 * Generate an RFC 7638 JWK thumbprint for a given key.
 * This creates a stable, deterministic identifier for the key.
 *
 * @param jwk - The JSON Web Key
 * @returns The base64url-encoded SHA-256 thumbprint
 */
export async function generateJwkThumbprint(jwk: JsonWebKey): Promise<string> {
  // RFC 7638: Only include required members for each key type
  const requiredMembers = getRequiredMembers(jwk)

  // RFC 7638 requires lexicographic ordering of JSON keys
  const jwkJson = JSON.stringify(
    requiredMembers,
    Object.keys(requiredMembers).sort()
  )

  // Hash with SHA-256 and convert to base64url
  const data = new TextEncoder().encode(jwkJson)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)

  return base64urlEncode(new Uint8Array(hashBuffer))
}

/**
 * Extract only the required members for JWK thumbprint according to RFC 7638.
 */
function getRequiredMembers(jwk: JsonWebKey): Record<string, unknown> {
  switch (jwk.kty) {
    case "RSA":
      return { kty: jwk.kty, n: jwk.n, e: jwk.e }
    case "EC":
      return { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y }
    case "OKP":
      return { kty: jwk.kty, crv: jwk.crv, x: jwk.x }
    default:
      return jwk as unknown as Record<string, unknown>
  }
}

/**
 * Convert ArrayBuffer to base64url encoding (RFC 4648).
 */
function base64urlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}
