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

const result = await resolver.resolve("did:jwks:example.auth0.com")
console.log(result.didDocument)
```

## API

### `getResolver(options?): ResolverRegistry`

Returns a resolver registry for use with `did-resolver`.

Options:

- `fetch`: The fetch function to use. Default: `globalThis.fetch`.
- `allowedHttpHosts`: Hosts that may use `http`. All other hosts use `https`. Use this for local development and testing. Default: `[]`.
- `discoveryDids`: DIDs that resolve through OAuth2/OIDC discovery instead of the fixed JWKS location. DIDs are compared as exact strings. Default: `[]`.

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

// Resolve Auth0's JWKS as a DID
const auth0Result = await resolver.resolve("did:jwks:example.auth0.com")

// Resolve custom domain with path
const customResult = await resolver.resolve(
  "did:jwks:auth.mycompany.com:api:v1"
)
```

### Opt-in Discovery

Google and GitHub publish their keys only through OAuth2/OIDC discovery. Name each DID that may use discovery. All other DIDs read only the fixed JWKS location.

```typescript
import { Resolver } from "did-resolver"
import { getResolver } from "jwks-did-resolver"

const resolver = new Resolver(
  getResolver({
    discoveryDids: [
      "did:jwks:accounts.google.com",
      "did:jwks:token.actions.githubusercontent.com"
    ]
  })
)

const googleResult = await resolver.resolve("did:jwks:accounts.google.com")
const githubResult = await resolver.resolve(
  "did:jwks:token.actions.githubusercontent.com"
)
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
2. **Fetch JWKS** from exactly one location:
   - **Strict mode** (default):
     - Root DID: `https://domain/.well-known/jwks.json`
     - Path DID: `https://domain/{path}/jwks.json`
   - **Discovery mode** (only for DIDs in `discoveryDids`): read the discovery document, check that its `issuer` exactly equals the DID's URL, then fetch its `jwks_uri`. The `jwks_uri` must use `https`, and may be on a different origin.
     - Root DID: `https://domain/.well-known/openid-configuration`
     - Path DID: `https://domain/.well-known/openid-configuration/{path}`
3. **Transform**: Converts JWKS to DID verification methods
4. **Return**: Standard DID Resolution result

A 404, a network error or a malformed document makes resolution fail. The resolver never falls back from one location to another, and never combines key sets from two locations.

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
