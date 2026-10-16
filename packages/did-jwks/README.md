# did-jwks

Core implementation of the [`did:jwks`](https://github.com/catena-labs/did-jwks) method that enables OAuth2/OIDC JWKS endpoints to be used as DID identifiers.

## Installation

```bash
npm install did-jwks
```

In most cases, you will want to use the [`jwks-did-resolver`](../jwks-did-resolver) package with the [`did-resolver`](https://github.com/decentralized-identity/did-resolver) package.

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
   - Root DID direct lookup: `https://domain/.well-known/jwks.json`
   - Path DID direct lookup: `https://domain/{path}/jwks.json`
   - Root DID OAuth2 discovery: `https://domain/.well-known/openid-configuration`
   - Path DID OAuth2 discovery: `https://domain/.well-known/openid-configuration/{path}`
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
// Resolves to https://auth.example.com/tenant/123/jwks.json
```

## License (MIT)

Copyright (c) 2026 [Catena Labs, Inc](https://catenalabs.com). See [`LICENSE`](./LICENSE) for details.
