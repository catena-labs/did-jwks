# did:jwks Method

A DID method that bridges the gap between existing OAuth2/OIDC infrastructure and the DID ecosystem by making JWKS endpoints directly usable as DID identifiers.

See the **[full specification](./spec.md)** (draft) - detailed technical information, security considerations, and implementation details.

## Example

```
did:jwks:accounts.google.com
```

## Overview

The `did:jwks` method allows existing OAuth2 providers to become DID-compatible without any changes to their infrastructure. It leverages battle-tested JWKS key rotation that companies already run and provides explicit semantics for key discovery.

### How it works

- `did:jwks:example.com` resolves to `https://example.com/.well-known/jwks.json`
- If that 404s, falls back to using OAuth2/OIDC discovery (`/.well-known/openid-configuration`) to find the actual JWKS endpoint
- Transforms the JWKS into a standard DID document with proper verification methods

### Key Benefits

- **Instant compatibility**: Existing OAuth2 providers become DID-compatible without any changes
- **No new infrastructure**: Leverages existing JWKS key rotation infrastructure
- **Explicit semantics**: Instead of guessing where to find keys, `did:jwks:domain.com` makes it unambiguous
- **Standard tooling**: Works with existing DID resolution libraries

### Use Cases

- JWT verification where issuer is `did:jwks:mycompany.com` instead of just `mycompany.com`
- Verifiable credentials issued by OAuth2 providers
- DID-Comm using corporate key management
- Any domain-based cryptographic verification

### Limitations

Similar to `did:key` and `did:pkh`, the `did:jwks` DID document is dynamically generated from the JWKS endpoint rather than being authored and stored. This means the DID document can not contain `service` endpoints, custom `controller`s, or any other custom metadata.

### The Problem It Solves

Today if you get a JWT signed by `mycompany.com`, you have to guess where their public keys are. With `did:jwks`, the verification process is standardized and discoverable. It essentially turns "I have OAuth2 keys" into "I have a DID" with zero friction.

## Implementations

This repository contains two main implementations:

### [`did-jwks`](./packages/did-jwks) - Core Implementation

The core `did:jwks` method implementation with CLI and direct resolution capabilities.

```bash
npm install did-jwks
```

### [`jwks-did-resolver`](./packages/jwks-did-resolver) - DID Resolver Integration

A resolver plugin for the standard [`did-resolver`](https://github.com/decentralized-identity/did-resolver) library.

```bash
npm install jwks-did-resolver
```

## License (MIT)

Copyright (c) 2025 [Catena Labs, Inc](https://catenalabs.com). See [`LICENSE`](./LICENSE) for details.
