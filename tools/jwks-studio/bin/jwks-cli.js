#!/usr/bin/env node

/**
 * Catena Labs did:jwks CLI
 */

import { defaultDidResolver } from '../src/core/did-resolver.js';
import { defaultJwksGenerator } from '../src/core/jwks-generator.js';

const args = process.argv.slice(2);
const command = args[0] || 'help';

async function main() {
  switch (command.toLowerCase()) {
    case 'resolve': {
      const did = args[1] || 'did:jwks:https:auth.catena.network:.well-known:jwks.json#key-1';
      console.log(`\n🔍 Resolving W3C DID Document for '${did}'...`);
      const res = defaultDidResolver.resolve(did);
      console.log(JSON.stringify(res.didDocument, null, 2));
      console.log(`\n  Content-Type: ${res.didResolutionMetadata.contentType}\n`);
      break;
    }

    case 'generate': {
      const domain = args[1] || 'agent.catena.network';
      console.log(`\n🔐 Generating JWKS & did:jwks DID Key Pair for domain '${domain}'...`);
      const gen = defaultJwksGenerator.generateJwks({ domain, keyType: 'Ed25519' });
      console.log(`  DID Identifier:  ${gen.did}`);
      console.log(`  Generated JWK:   ${JSON.stringify(gen.keys[0])}\n`);
      break;
    }

    case 'studio': {
      console.log('\n🌐 Launching did:jwks Studio on :3421...');
      await import('../src/server/app.js');
      break;
    }

    default: {
      console.log(`
╔══════════════════════════════════════════════════════════════════╗
║               🆔 CATENA LABS DID:JWKS CLI                        ║
║     Generative Decentralized Identifier & JWKS Resolver Suite    ║
╚══════════════════════════════════════════════════════════════════╝

Commands:
  did-jwks-cli resolve [didString]      Resolve did:jwks identifier to W3C DID Document
  did-jwks-cli generate [domain]        Generate JWKS key set and output did:jwks URI
  did-jwks-cli studio                   Launch Interactive Web Studio on :3421
      `);
      break;
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
