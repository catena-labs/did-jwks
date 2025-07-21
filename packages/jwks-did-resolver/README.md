# jwks-did-resolver

A `did:jwks` resolver plugin for the standard [`did-resolver`](https://github.com/decentralized-identity/did-resolver) library.

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

### `getResolver(): ResolverRegistry`

Returns a resolver registry for use with `did-resolver`.

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
2. **JWKS Discovery**:
   - Direct: `https://domain{/path}/.well-known/jwks.json`
   - OAuth2 Discovery: `https://domain{/path}/.well-known/openid-configuration`
3. **Transform**: Converts JWKS to DID verification methods
4. **Return**: Standard DID Resolution result

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

Copyright (c) 2025 [Catena Labs, Inc](https://catenalabs.com). See [`LICENSE`](./LICENSE) for details.
