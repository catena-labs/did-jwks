/**
 * JWKS Generator & Verifiable Credential Signer
 */

import crypto from 'crypto';

export class JwksGenerator {
  generateJwks({ domain, keyType }) {
    const kid = 'key_' + crypto.randomBytes(4).toString('hex');
    const did = `did:jwks:https:${domain || 'agent.catena.network'}:.well-known:jwks.json#${kid}`;

    const jwk = {
      kty: keyType === 'RSA' ? 'RSA' : 'OKP',
      crv: keyType === 'RSA' ? undefined : 'Ed25519',
      use: 'sig',
      alg: keyType === 'RSA' ? 'RS256' : 'EdDSA',
      kid,
      n: keyType === 'RSA' ? crypto.randomBytes(128).toString('base64url') : undefined,
      e: keyType === 'RSA' ? 'AQAB' : undefined,
      x: keyType !== 'RSA' ? crypto.randomBytes(32).toString('base64url') : undefined,
    };

    return {
      did,
      keys: [jwk],
      generatedAt: new Date().toISOString(),
    };
  }
}

export const defaultJwksGenerator = new JwksGenerator();
