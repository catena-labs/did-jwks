/**
 * did:jwks Resolver & Generator Unit Tests
 */

import { defaultDidResolver } from '../src/core/did-resolver.js';
import { defaultJwksGenerator } from '../src/core/jwks-generator.js';

async function runResolverTests() {
  console.log('Testing Catena Labs did:jwks DID Resolver & JWKS Generator...');

  // 1. Resolve did:jwks
  const testDid = 'did:jwks:https:auth.catena.network:.well-known:jwks.json#key-1';
  const res = defaultDidResolver.resolve(testDid);

  if (!res.didDocument || res.didDocument.id !== testDid) {
    throw new Error('did:jwks resolution failed');
  }

  // 2. Generate JWKS
  const gen = defaultJwksGenerator.generateJwks({ domain: 'agent.catena.network', keyType: 'Ed25519' });
  if (!gen.did.startsWith('did:jwks:') || gen.keys.length === 0) {
    throw new Error('JWKS & did:jwks key generation failed');
  }

  console.log(`✅ Catena Labs did:jwks W3C Resolver & JWKS Generator Tested (${res.didDocument.id})!`);
}

runResolverTests().catch(e => {
  console.error('❌ Resolver Test Failed:', e);
  process.exit(1);
});
