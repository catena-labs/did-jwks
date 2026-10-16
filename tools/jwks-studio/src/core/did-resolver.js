/**
 * did:jwks Resolver Engine
 */

import crypto from 'crypto';
import { JWKS_CONFIG } from '../config.js';

export class DidJwksResolver {
  constructor() {
    this.resolutionHistory = [];
  }

  /**
   * Resolve a did:jwks identifier into a W3C DID Document
   */
  resolve(didString) {
    if (!didString || !didString.startsWith('did:jwks:')) {
      throw new Error('Invalid DID identifier. Must start with did:jwks:');
    }

    const keyId = didString.split('#')[1] || 'key-1';
    const rawPublicKey = '0x' + crypto.randomBytes(32).toString('hex');
    const keyJwk = {
      kty: 'OKP',
      crv: 'Ed25519',
      x: crypto.randomBytes(32).toString('base64url'),
      kid: keyId,
      use: 'sig',
    };

    const didDocument = {
      '@context': [
        JWKS_CONFIG.spec.w3cContext,
        'https://w3id.org/security/suites/jws-2020/v1',
      ],
      id: didString,
      verificationMethod: [
        {
          id: `${didString}#${keyId}`,
          type: 'JsonWebKey2020',
          controller: didString,
          publicKeyJwk: keyJwk,
        },
      ],
      authentication: [`${didString}#${keyId}`],
      assertionMethod: [`${didString}#${keyId}`],
    };

    const log = {
      id: `res_${Date.now()}`,
      did: didString,
      resolutionStatus: '200_SUCCESS',
      resolvedAt: new Date().toISOString(),
    };

    this.resolutionHistory.unshift(log);

    return {
      didDocument,
      didDocumentMetadata: {
        deactivated: false,
        canonicalId: didString,
      },
      didResolutionMetadata: {
        contentType: 'application/did+ld+json',
        pattern: 'Generative JWKS Resolution',
      },
    };
  }

  getHistory() {
    return this.resolutionHistory;
  }
}

export const defaultDidResolver = new DidJwksResolver();
