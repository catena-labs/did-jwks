# did-jwks

Core implementation of the [`did:jwks`](https://github.com/catena-labs/did-jwks) method that enables OAuth2/OIDC JWKS endpoints to be used as DID identifiers.

## Installation

```bash
npm install did-jwks
```

In most cases, you will want to use the [`jwks-did-resolver`](../jwks-did-resolver) packages with the [`did-resolver`](https://github.com/decentralized-identity/did-resolver) package.

## Usage

```typescript
import { fetchJwksDidDocument } from "did-jwks"

const didDocument = await fetchJwksDidDocument("did:jwks:accounts.google.com")
console.log(didDocument)
```

### CLI

```bash
npx did-jwks did:jwks:accounts.google.com

# Discovery-only: do not read jwks.json when discovery returns 404
npx did-jwks --no-fallback did:jwks:accounts.google.com
```

## API

### `fetchJwksDidDocument(did, options?): Promise<DidDocument | null>`

Fetches a DID Document for a `did:jwks` identifier. Returns `null` if resolution fails. A network error rejects the promise.

```typescript
import { fetchJwksDidDocument } from "did-jwks"

const didDocument = await fetchJwksDidDocument("did:jwks:example.com")

console.log(didDocument)
```

#### Options

- `fetch`: The fetch function to use. Default: `globalThis.fetch`.
- `allowedHttpHosts`: Hosts that may use `http`. All other hosts use `https`. Use this for local development and testing. An `http` `jwks_uri` is allowed only when the DID itself uses an allowed http host. Default: `[]`.
- `jwksFallback`: Read `jwks.json` when the discovery document returns 404. Set to `false` for discovery-only resolution. Default: `true`.

```typescript
const didDocument = await fetchJwksDidDocument("did:jwks:example.com", {
  jwksFallback: false
})
```

## How It Works

1. **Parse DID**: Extracts domain and optional path from the DID
2. **Discovery**: Fetches the OAuth2/OIDC discovery document:
   - Root DID: `https://domain/.well-known/openid-configuration`
   - Path DID: `https://domain/.well-known/openid-configuration/{path}`
3. **Select one key location**:
   - Valid discovery document: its `jwks_uri`. The `issuer` must equal the DID's URL (one terminating `/` allowed). The `jwks_uri` must use `https`, must not carry userinfo, and may be on a different origin.
   - Discovery returns 404: the fallback file, `https://domain/.well-known/jwks.json` or `https://domain/{path}/jwks.json` (unless `jwksFallback` is `false`).
   - Any other discovery result: resolution fails.
4. **Fetch JWKS** from the selected location. A miss, an empty key set, or a redirect to `http` at any hop fails. It never moves to another location.
5. **Transform**: Converts JWKS keys to DID verification methods
6. **Generate**: Creates a standard DID document

## Examples

### Google OAuth2

```typescript
const result = await fetchJwksDidDocument("did:jwks:accounts.google.com")
// Resolves Google's JWKS from https://www.googleapis.com/oauth2/v3/certs
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
