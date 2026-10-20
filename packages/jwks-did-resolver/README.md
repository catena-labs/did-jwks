# jwks-did-resolver

A [`did:jwks`](https://github.com/catena-labs/did-jwks) resolver plugin for the standard [`did-resolver`](https://github.com/decentralized-identity/did-resolver) library.

## Installation

```bash
npm install jwks-did-resolver did-resolver
```

## Usage

```typescript
import { Resolver } from "did-resolver"
import { getResolver } from "jwks-did-resolver"

const resolver = new Resolver({
  ...getResolver()
})

const result = await resolver.resolve("did:jwks:accounts.google.com")
console.log(result.didDocument)
```

## API

### `getResolver(options?): ResolverRegistry`

Returns a resolver registry for use with `did-resolver`.

Options:

- `fetch`: The fetch function to use. Default: `globalThis.fetch`.
- `allowedHttpHosts`: Hosts that may use `http` and a port. All other hosts use `https` with no port. Entries match without regard to case. An allowed host skips the DNS-name check, so it can be an IP address such as `127.0.0.1`. Use this for local development and testing only. An `http` `jwks_uri` is allowed only when the DID itself uses an allowed http host. Default: `[]`.
- `jwksFallback`: Read `jwks.json` when the discovery document returns 404. Set to `false` for discovery-only resolution. Default: `true`.

```typescript
import { Resolver } from "did-resolver"
import { getResolver } from "jwks-did-resolver"

const resolver = new Resolver({
  ...getResolver()
  // Add other DID method resolvers
})
```

## Examples

### Basic Resolution

```typescript
import { Resolver } from "did-resolver"
import { getResolver } from "jwks-did-resolver"

const resolver = new Resolver(getResolver())

// Resolve Google's OAuth2 JWKS as a DID
const googleResult = await resolver.resolve("did:jwks:accounts.google.com")

// Resolve GitHub Actions JWKS as a DID
const githubResult = await resolver.resolve(
  "did:jwks:token.actions.githubusercontent.com"
)

// Resolve custom domain with path
const customResult = await resolver.resolve(
  "did:jwks:auth.mycompany.com:api:v1"
)
```

### Discovery-Only Resolution

Turn off the `jwks.json` fallback. DIDs whose host has no discovery document then fail to resolve.

```typescript
import { Resolver } from "did-resolver"
import { getResolver } from "jwks-did-resolver"

const resolver = new Resolver(getResolver({ jwksFallback: false }))
```

### Multi-Method Resolver

```typescript
import { Resolver } from "did-resolver"
import { getResolver as getWebResolver } from "web-did-resolver"
import { getResolver as getJwksResolver } from "jwks-did-resolver"

const resolver = new Resolver({
  ...getWebResolver(),
  ...getJwksResolver()
  // Other resolvers...
})

// Now supports both did:web and did:jwks
const webResult = await resolver.resolve("did:web:example.com")
const jwksResult = await resolver.resolve("did:jwks:example.com")
```

## Resolution Algorithm

1. **Parse DID**: Extracts domain and path components
2. **Discovery**: Fetches the OAuth2/OIDC discovery document:
   - Root DID: `https://domain/.well-known/openid-configuration`
   - Path DID: `https://domain/.well-known/openid-configuration/{path}`
3. **Select one key location**:
   - Valid discovery document: its `jwks_uri`. The `issuer` must equal the DID's URL (one terminating `/` allowed).
   - Discovery returns 404: `https://domain/.well-known/jwks.json` or `https://domain/{path}/jwks.json` (unless `jwksFallback` is `false`).
   - Any other discovery result: resolution fails.
4. **Fetch JWKS** from the selected location. A miss, an empty key set, or a redirect to `http` at any hop fails. It never moves to another location.
5. **Transform**: Converts JWKS to DID verification methods
6. **Return**: Standard DID Resolution result

## Error Handling

Returns standard DID Resolution error types:

```typescript
const result = await resolver.resolve("did:jwks:invalid.domain")

switch (result.didResolutionMetadata.error) {
  case "invalidDid":
    // DID syntax error
    break
  case "notFound":
    // JWKS endpoint not found
    break
  case "representationNotSupported":
    // Invalid accept header
    break
}
```

## License (MIT)

Copyright (c) 2026 [Catena Labs, Inc](https://catenalabs.com). See [`LICENSE`](./LICENSE) for details.
