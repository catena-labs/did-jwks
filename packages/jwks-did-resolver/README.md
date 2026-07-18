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
   - Root DID direct lookup: `https://domain/.well-known/jwks.json`
   - Path DID direct lookup: `https://domain/{path}/jwks.json`
   - Root DID OAuth2 discovery: `https://domain/.well-known/openid-configuration`
   - Path DID OAuth2 discovery: `https://domain/.well-known/openid-configuration/{path}`
3. **Transform**: Converts JWKS to DID verification methods
4. **Return**: Standard DID Resolution result

## Error Handling

Returns DID Resolution error types used by this resolver (compatible with
[`did-resolver`](https://github.com/decentralized-identity/did-resolver)):

```typescript
const result = await resolver.resolve("did:jwks:invalid.domain")

switch (result.didResolutionMetadata.error) {
  case "invalidDid":
    // Empty or syntactically invalid DID
    break
  case "unsupportedDidMethod":
    // DID method is not did:jwks
    break
  case "notFound":
    // JWKS endpoint not found / could not be resolved
    break
  case "internalError":
    // Unexpected failure while fetching or processing JWKS
    break
  case "representationNotSupported":
    // Reserved for unsupported accept / representation requests
    break
}
```

## License (MIT)

Copyright (c) 2026 [Catena Labs, Inc](https://catenalabs.com). See [`LICENSE`](./LICENSE) for details.
