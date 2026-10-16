/**
 * Catena Labs did:jwks Specification & W3C Context Configuration
 */

export const JWKS_CONFIG = {
  spec: {
    method: 'did:jwks',
    w3cContext: 'https://www.w3.org/ns/did/v1',
    description: 'Generative DID method for resolving JWKS endpoints directly into W3C DID Documents.',
    supportedCurves: ['Ed25519', 'P-256', 'Secp256k1', 'RSA-2048'],
  },
  sampleDids: [
    {
      did: 'did:jwks:https:auth.catena.network:.well-known:jwks.json#key-1',
      name: 'Catena AI Agent Auth Provider',
      jwksUrl: 'https://auth.catena.network/.well-known/jwks.json',
      keyType: 'Ed25519',
    },
    {
      did: 'did:jwks:https:accounts.google.com:.well-known:openid-configuration#key-2',
      name: 'Enterprise OpenID Connect Provider',
      jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
      keyType: 'RSA-2048',
    },
  ],
};
