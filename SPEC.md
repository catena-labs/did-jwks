# did:jwks Method Specification

- **Authors**: Catena Labs, Matt Venables
- **Latest version**: https://github.com/catena-labs/did-jwks/blob/main/SPEC.md
- **Reference implementation**: https://github.com/catena-labs/did-jwks
- **Status**: Submitted to W3C DID Extensions Registry

## Introduction

### Problem Statement

The OAuth2 and OpenID Connect ecosystems have established JWKS (JSON Web Key Set) as the standard mechanism for public key distribution and verification. Thousands of organizations already publish JWKS endpoints for JWT signature verification, key rotation, and cryptographic operations. However, these existing cryptographic infrastructures cannot easily interoperate with the DID ecosystem without custom integration work.

When verifying a JWT today, if the issuer field contains a domain like `mycompany.com`, the verifier must guess where to find the public keys - either through OAuth2 discovery or by trying common endpoints like `/.well-known/jwks.json`. This creates ambiguity and friction in cryptographic verification workflows.

This method is designed with usability in mind, leveraging existing infrastructure to bridge the gap. By making JWKS endpoints directly addressable as DID identifiers, did:jwks enables immediate interoperability between OAuth2 infrastructure and DID-based systems.

### Relationship to Other DID Methods

`did:jwks` is similar to `did:web` in that it relies on DNS and HTTPS infrastructure for resolution. However, while `did:web` requires publishing a dedicated DID document, `did:jwks` leverages existing JWKS endpoints that organizations already maintain for OAuth2/OIDC operations.

Like `did:key` and `did:pkh`, the DID document is dynamically generated rather than authored and stored, making it a purely generative method optimized for cryptographic verification.

## Design Goals

1. **Zero Migration Cost**: Existing OAuth2 providers become DID-compatible without any infrastructure changes or new endpoints.

1. **Explicit Semantics**: Replace ambiguous key discovery with deterministic resolution - `did:jwks:example.com` unambiguously points to JWKS endpoints.

1. **Standard OAuth2 Compatibility**: Support both direct JWKS endpoints and OAuth2 discovery patterns used by major providers.

1. **Existing Key Management**: Leverage battle-tested JWKS key rotation and management that organizations already operate.

## Identifier Scheme

### Syntax and Interpretation

```
jwks-did = "did:jwks:" domain-name *( ":" path )
domain-name = DNS domain name
path     = segment *( ":" segment )
segment  = *( unreserved / pct-encoded )
```

Like `did:web`, colons (`:`) in the path are converted to forward slashes (`/`) during resolution.

### Resolution Algorithm

1. **Parse Path**: Convert colons (`:`) in the path to forward slashes (`/`)
1. **Direct JWKS**: Try `https://{domain}{/path}/.well-known/jwks.json`
1. **OAuth2/OIDC Discovery**: If direct fails, fetch `https://{domain}{/path}/.well-known/openid-configuration` and extract `jwks_uri`
1. **Transform**: Convert JWKS to DID document format

### Examples

|   Provider    |                 DID Identifier                 |                         Resolves To                          |
| :-----------: | :--------------------------------------------: | :----------------------------------------------------------: |
|     Auth0     |          `did:jwks:example.auth0.com`          |      `https://example.auth0.com/.well-known/jwks.json`       |
|    Google     |         `did:jwks:accounts.google.com`         | `https://www.googleapis.com/oauth2/v3/certs` (via discovery) |
|    GitHub     | `did:jwks:token.actions.githubusercontent.com` |                OAuth2 discovery → `jwks_uri`                 |
| Corporate SSO |           `did:jwks:sso.company.com`           |       `https://sso.company.com/.well-known/jwks.json`        |
| With Subpath  |         `did:jwks:example.com:api:v1`          |      `https://example.com/api/v1/.well-known/jwks.json`      |
|  Tenant Path  |     `did:jwks:auth.example.com:tenant123`      |  `https://auth.example.com/tenant123/.well-known/jwks.json`  |

## Operations

### Create

The domain is validated as a valid DNS name, optional path segments are validated, and then prefixed with `did:jwks:`. Path segments are joined with colons (`:`) which will be converted to forward slashes (`/`) during resolution.

### Read (Resolve)

Resolution implements the DID Core interface:

```
resolve(did, resolutionOptions) →
   « didResolutionMetadata, didDocument, didDocumentMetadata »
```

Construct the DID Document for _did_ as follows:

1. Parse the DID to extract _domain_ and optional _path_ according to syntax above
1. Convert colons (`:`) in _path_ to forward slashes (`/`) to form the URL path
1. **Fetch JWKS**:
   - Try `https://{domain}{/path}/.well-known/jwks.json`
   - If 404, fetch `https://{domain}{/path}/.well-known/openid-configuration`
   - Extract `jwks_uri` and fetch from that endpoint
1. **Generate DID Document**:
   - Set `id` to _did_
   - Set `@context` to `["https://www.w3.org/ns/did/v1"]`
   - For each key in JWKS `keys` array:
     - Generate RFC 7638 JWK thumbprint for stable fragment identifier
     - Create verification method with `id: "{did}#{thumbprint}"`
     - Set `type: "JsonWebKey"`
     - Set `controller: {did}`
     - Set `publicKeyJwk` to the key (without redundant `kid`)
   - Populate `assertionMethod` and `authentication` with keys where `use: "sig"` (default if unspecified)
   - Populate `keyAgreement` with keys where `use: "enc"`

### Update

No updates possible. DID documents are dynamically generated from JWKS endpoints.

### Delete

No deletion possible. DID documents exist only as long as the underlying JWKS endpoint is available.

## Security & Privacy Considerations

### DNS and TLS Dependencies

The security of `did:jwks` identifiers is bound to the security of DNS and TLS infrastructure. Compromise of domain control or certificate authority systems could allow key substitution attacks.

### Key Rotation and History

JWKS key rotation removes old keys from the endpoint, but there is no mechanism to verify signatures created with previously valid keys. This creates a fundamental limitation:

- **Short-lived tokens**: JWTs and other assertions should have short expiration times
- **No historical verification**: Signatures cannot be verified after key rotation occurs
- **Real-time validation**: Verification must happen while keys are still published in the JWKS

This makes `did:jwks` appropriate for:

- OAuth2/OIDC JWT validation
- API authentication tokens
- Short-lived verifiable presentations
- Real-time webhook signature verification

But **NOT appropriate for**:

- Long-term verifiable credentials
- Archival signature verification
- Legal documents requiring long-term validity

### Network Availability

Resolution requires network access to JWKS endpoints. Unlike some DID methods, `did:jwks` cannot be resolved offline and depends on the availability of the target domain's infrastructure.

### OAuth2 Discovery Complexity

The fallback to OAuth2 discovery introduces additional failure modes and potential security considerations around redirect attacks or malformed discovery documents.

## Limitations

**Generated DID Documents**: Like `did:key` and `did:pkh`, the DID document is dynamically generated from the JWKS endpoint rather than being authored and stored. This means:

- **No Service Endpoints**: Cannot include service endpoints for DID-Comm, credential issuance, or other DID services
- **No Custom Controllers**: The controller field always matches the DID identifier - no support for external controllers or delegation
- **No Custom Verification Relationships**: All keys are automatically assigned to `authentication` and `assertionMethod` based on their `use` field - no fine-grained control over verification relationships
- **No Metadata**: Cannot include additional metadata like created/updated timestamps, proof chains, or custom properties

**Infrastructure Dependencies**:

- **DNS/Domain Control Required**: The DID is only as secure as the domain's DNS and TLS infrastructure
- **JWKS Endpoint Availability**: If the JWKS endpoint is down, the DID cannot be resolved
- **OAuth2 Discovery Complexity**: Resolution may require multiple HTTP requests and can fail at various points in the discovery chain

**Key Management Limitations**:

- **No Key History**: When keys are rotated in JWKS, there's no way to verify signatures from previous key versions
- **Limited Key Types**: Restricted to key types supported by JWKS (primarily RSA, EC, and symmetric keys)
- **No Key Revocation**: JWKS removal is the only revocation mechanism - no support for explicit revocation lists or timestamps

**Ecosystem Constraints**:

- **OAuth2 Provider Dependent**: Only works with domains that already publish JWKS endpoints
- **No Offline Verification**: Requires network access to resolve, unlike some other DID methods
- **Standards Compliance**: Subject to changes in OAuth2/OIDC specifications and JWKS formatting

## Use Cases

### JWT Verification with DIDs

Instead of:

```json
{
  "iss": "mycompany.com",
  "sub": "alice@mycompany.com",
  "aud": "api.example.com"
}
```

Use:

```json
{
  "iss": "did:jwks:mycompany.com",
  "sub": "did:jwks:alice.com",
  "aud": "did:jwks:api.example.com"
}
```

This makes key resolution unambiguous and works with existing DID verification libraries.

### Verifiable Credentials

OAuth2 providers can issue verifiable credentials without setting up dedicated DID infrastructure:

```json
{
  "issuer": "did:jwks:university.edu",
  "credentialSubject": {
    "id": "did:jwks:student.university.edu",
    "degree": "Bachelor of Science"
  }
}
```

### Enterprise Identity

Corporate SSO systems become DID-compatible for enterprise identity workflows, enabling seamless integration between OAuth2 authentication and DID-based authorization systems.

### API Authentication

Services can issue JWTs with DID-based issuer fields, making key discovery explicit:

```json
{
  "iss": "did:jwks:api.service.com",
  "sub": "client-12345",
  "scope": "read:data"
}
```

### Webhook Verification

Instead of documenting "find our webhook signing key at docs.example.com/webhooks", services can sign webhooks with `did:jwks:api.service.com` making verification discoverable.

## Reference Implementation

This specification is implemented in TypeScript at [github.com/catena-labs/did-jwks](https://github.com/catena-labs/did-jwks).

The implementation includes:

- Full DID resolver supporting both direct JWKS and OAuth2 discovery
- Comprehensive JWKS and DID document validation schemas using Valibot
- Test vectors for major OAuth2 providers (Google, Auth0, GitHub, etc.)
- Integration with standard DID resolution libraries

## Test Vectors

The following test vectors demonstrate resolution for major OAuth2 providers:

### Google

- **DID**: `did:jwks:accounts.google.com`
- **Discovery**: `https://accounts.google.com/.well-known/openid-configuration`
- **JWKS URI**: `https://www.googleapis.com/oauth2/v3/certs`

### Auth0

- **DID**: `did:jwks:example.auth0.com`
- **Direct JWKS**: `https://example.auth0.com/.well-known/jwks.json`

### GitHub Actions

- **DID**: `did:jwks:token.actions.githubusercontent.com`
- **Discovery**: `https://token.actions.githubusercontent.com/.well-known/openid-configuration`
- **JWKS URI**: `https://token.actions.githubusercontent.com/.well-known/jwks`

[Complete test vectors available in the repository]

---

## Appendix: Related Standards

- [RFC 7517 - JSON Web Key (JWK)](https://tools.ietf.org/html/rfc7517)
- [RFC 7518 - JSON Web Algorithms (JWA)](https://tools.ietf.org/html/rfc7518)
- [RFC 8414 - OAuth 2.0 Authorization Server Metadata](https://tools.ietf.org/html/rfc8414)
- [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)
- [DID Core v1.0](https://www.w3.org/TR/did-core/)
- [DID Specification Registries](https://www.w3.org/TR/did-spec-registries/)
