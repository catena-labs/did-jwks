# did-jwks

Core implementation of the [`did:jwks`](https://github.com/catena-labs/did-jwks) method that enables OAuth2/OIDC JWKS endpoints to be used as DID identifiers.

## Installation

```bash
npm install did-jwks
```

In most cases, you will want to use the []`jwks-did-resolver`](../jwks-did-resolver) packages with the [`did-resolver`](https://github.com/decentralized-identity/did-resolver) package.

## Usage

```typescript
import { fetchJwksDidDocument } from "did-jwks"

const didDocument = await fetchJwksDidDocument("did:jwks:accounts.google.com")
console.log(didDocument)
```

### CLI

```bash
npx did-jwks did:jwks:accounts.google.com
```

## API

### `fetchJwksDidDocument(did: string): Promise<DidDocument>`

Fetches a DID Document for a `did:jwks` identifier.

```typescript
import { fetchJwksDidDocument } from "did-jwks"

const didDocument = await fetchJwksDidDocument("did:jwks:example.com")

console.log(didDocument)
```

## How It Works

1. **Parse DID**: Extracts domain and optional path from the DID
2. **JWKS Discovery**: Attempts to fetch JWKS from:
   - Direct: `https://domain/.well-known/jwks.json`
   - OAuth2 Discovery: `https://domain/.well-known/openid-configuration`
3. **Transform**: Converts JWKS keys to DID verification methods
4. **Generate**: Creates a standard DID document

## Examples

### Google OAuth2

```typescript
const result = await fetchJwksDidDocument("did:jwks:accounts.google.com")
// Resolves Google's JWKS for OAuth2 token verification
```

### GitHub Actions

```typescript
const result = await fetchJwksDidDocument(
  "did:jwks:token.actions.githubusercontent.com"
)
// Resolves GitHub's JWKS for Actions token verification
```

### Custom Domain with Path

```typescript
const result = await fetchJwksDidDocument(
  "did:jwks:auth.example.com:tenant:123"
)
// Resolves to https://auth.example.com/tenant/123/.well-known/jwks.json
```

## License (MIT)

Copyright (c) 2025 [Catena Labs, Inc](https://catenalabs.com). See [`LICENSE`](./LICENSE) for details.
