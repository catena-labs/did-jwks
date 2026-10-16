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

const didDocument = await fetchJwksDidDocument("did:jwks:example.auth0.com")
console.log(didDocument)
```

### CLI

```bash
npx did-jwks did:jwks:example.auth0.com

# Opt the DID in to OAuth2/OIDC discovery
npx did-jwks --discovery did:jwks:accounts.google.com
```

## API

### `fetchJwksDidDocument(did, options?): Promise<DidDocument | null>`

Fetches a DID Document for a `did:jwks` identifier. Returns `null` if the JWKS is missing or malformed.

```typescript
import { fetchJwksDidDocument } from "did-jwks"

const didDocument = await fetchJwksDidDocument("did:jwks:example.com")

console.log(didDocument)
```

#### Options

- `fetch`: The fetch function to use. Default: `globalThis.fetch`.
- `allowedHttpHosts`: Hosts that may use `http`. All other hosts use `https`. Use this for local development and testing. Default: `[]`.
- `discoveryDids`: DIDs that resolve through OAuth2/OIDC discovery instead of the fixed JWKS location. DIDs are compared as exact strings. Default: `[]`.

```typescript
const didDocument = await fetchJwksDidDocument("did:jwks:accounts.google.com", {
  discoveryDids: ["did:jwks:accounts.google.com"]
})
```

## How It Works

1. **Parse DID**: Extracts domain and optional path from the DID
2. **Fetch JWKS** from exactly one location:
   - **Strict mode** (default):
     - Root DID: `https://domain/.well-known/jwks.json`
     - Path DID: `https://domain/{path}/jwks.json`
   - **Discovery mode** (only for DIDs in `discoveryDids`): read the discovery document, check that its `issuer` exactly equals the DID's URL, then fetch its `jwks_uri`. The `jwks_uri` must use `https`, and may be on a different origin.
     - Root DID: `https://domain/.well-known/openid-configuration`
     - Path DID: `https://domain/.well-known/openid-configuration/{path}`
3. **Transform**: Converts JWKS keys to DID verification methods
4. **Generate**: Creates a standard DID document

A 404, a network error or a malformed document makes resolution fail. The resolver never falls back from one location to another, and never combines key sets from two locations. A 404 never turns on discovery mode.

## Examples

### Google OAuth2

Google publishes its keys only through OIDC discovery, so the DID must be opted in.

```typescript
const result = await fetchJwksDidDocument("did:jwks:accounts.google.com", {
  discoveryDids: ["did:jwks:accounts.google.com"]
})
// Resolves Google's JWKS from https://www.googleapis.com/oauth2/v3/certs
```

### GitHub Actions

GitHub also publishes its keys only through OIDC discovery.

```typescript
const did = "did:jwks:token.actions.githubusercontent.com"
const result = await fetchJwksDidDocument(did, { discoveryDids: [did] })
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
