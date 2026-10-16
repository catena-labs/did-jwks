# did:jwks Method Specification

- **Authors**: Catena Labs, Matt Venables
- **Latest version**: https://github.com/catena-labs/did-jwks/blob/main/SPEC.md
- **Reference implementation**: https://github.com/catena-labs/did-jwks
- **Status**: Submitted to W3C DID Extensions Registry
- **Version**: 2 (2026-10-16). See the [Changelog](#changelog).

## Introduction

### Problem Statement

The OAuth2 and OpenID Connect ecosystems have established JWKS (JSON Web Key Set) as the standard mechanism for public key distribution and verification. Thousands of organizations already publish JWKS endpoints for JWT signature verification, key rotation, and cryptographic operations. However, these existing cryptographic infrastructures cannot easily interoperate with the DID ecosystem without custom integration work.

When verifying a JWT today, if the issuer field contains a domain like `mycompany.com`, the verifier must guess where to find the public keys - either through OAuth2 discovery or by trying common endpoints like `/.well-known/jwks.json`. This creates ambiguity and friction in cryptographic verification workflows.

This method is designed with usability in mind, leveraging existing infrastructure to bridge the gap. By making JWKS endpoints directly addressable as DID identifiers, did:jwks enables immediate interoperability between OAuth2 infrastructure and DID-based systems.

### Relationship to Other DID Methods

`did:jwks` is similar to `did:web` in that it relies on DNS and HTTPS infrastructure for resolution. However, while `did:web` requires publishing a dedicated DID document, `did:jwks` leverages existing JWKS endpoints that organizations already maintain for OAuth2/OIDC operations.

Like `did:key` and `did:pkh`, the DID document is dynamically generated rather than authored and stored, making it a purely generative method optimized for cryptographic verification.

## Design Goals

1. **Zero Migration Cost**: Providers that publish a JWKS at the fixed location become DID-compatible without infrastructure changes. Providers that publish keys only through an OAuth2/OIDC `jwks_uri` become DID-compatible when a verifier opts the identity in to discovery.

1. **Explicit Semantics**: Replace ambiguous key discovery with deterministic resolution. `did:jwks:example.com` points to exactly one JWKS location.

1. **Strict Resolution**: A resolver reads keys from one location only. A miss at that location ends resolution. It never makes the resolver read keys from a different location.

1. **Opt-in OAuth2 Compatibility**: A verifier can opt specific identities in to OAuth2/OIDC discovery, for providers that publish keys only through a discovery `jwks_uri`.

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

A resolver resolves each DID in one of two modes. Each mode reads keys from exactly one location.

1. **Parse Path**: Convert colons (`:`) in the path to forward slashes (`/`). This gives the _identity URL_: `https://{domain}` for root DIDs and `https://{domain}/{path}` for path DIDs.
1. **Select Mode**: Use discovery mode only if the verifier configured the DID for discovery mode (see [Discovery Mode Configuration](#discovery-mode-configuration)). Use strict mode for all other DIDs.
1. **Strict Mode** (default): Fetch the JWKS from the fixed location:
   - **Root DIDs** (no path): `https://{domain}/.well-known/jwks.json`
   - **Path DIDs**: `https://{domain}/{path}/jwks.json`
1. **Discovery Mode** (opt-in): Fetch the OAuth2/OIDC discovery document, check it, and fetch the JWKS from its `jwks_uri`:
   - **Root DIDs**: `https://{domain}/.well-known/openid-configuration`
   - **Path DIDs**: Per [RFC 8414](https://www.rfc-editor.org/rfc/rfc8414), `https://{domain}/.well-known/openid-configuration/{path}`
1. **Transform**: Convert the JWKS to DID document format.

If the selected location is missing or malformed, resolution fails. A resolver MUST NOT try the other mode or any other location.

> **Note**: Per [RFC 8615](https://www.rfc-editor.org/rfc/rfc8615), `.well-known` URIs are only defined at the root of the path hierarchy. Root DIDs use standard `.well-known` paths. Path DIDs use direct file paths for JWKS and [RFC 8414](https://www.rfc-editor.org/rfc/rfc8414)-style discovery for OAuth2/OIDC metadata, where `.well-known` is inserted between the origin and path to remain at the root.

### Examples

|   Provider    |                 DID Identifier                 |        Mode        |                          Resolves To                           |
| :-----------: | :--------------------------------------------: | :----------------: | :------------------------------------------------------------: |
|     Auth0     |          `did:jwks:example.auth0.com`          |       Strict       |       `https://example.auth0.com/.well-known/jwks.json`        |
| Corporate SSO |           `did:jwks:sso.company.com`           |       Strict       |        `https://sso.company.com/.well-known/jwks.json`         |
| With Subpath  |         `did:jwks:example.com:api:v1`          |       Strict       |             `https://example.com/api/v1/jwks.json`             |
|  Tenant Path  |     `did:jwks:auth.example.com:tenant123`      |       Strict       |         `https://auth.example.com/tenant123/jwks.json`         |
|    Google     |         `did:jwks:accounts.google.com`         | Discovery (opt-in) |          `https://www.googleapis.com/oauth2/v3/certs`          |
|    GitHub     | `did:jwks:token.actions.githubusercontent.com` | Discovery (opt-in) | `https://token.actions.githubusercontent.com/.well-known/jwks` |

Google and GitHub do not serve a JWKS at the fixed location. They resolve only if the verifier opts them in to discovery mode. In strict mode, both DIDs fail to resolve.

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
1. Form the _identity URL_: `https://{domain}` for root DIDs, or `https://{domain}/{path}` for path DIDs. The identity URL has no trailing slash.
1. **Select the JWKS location**. Select exactly one location:
   - If the verifier configured _did_ for discovery mode, the location is the result of **Discover the JWKS URI** below. If discovery fails, resolution fails.
   - Otherwise, the location is the fixed location:
     - **Root DIDs** (no path): `https://{domain}/.well-known/jwks.json`
     - **Path DIDs**: `https://{domain}/{path}/jwks.json`
1. **Fetch the JWKS** from the selected location. If the response is not a success, if the request fails, or if the body is not a valid JWKS, resolution fails. The resolver MUST NOT fetch keys from any other location. In particular, it MUST NOT fetch a discovery document after a strict-mode miss, and it MUST NOT fetch the fixed location after a discovery-mode miss.
1. **Generate DID Document**:
   - Set `id` to _did_
   - Set `@context` to `["https://www.w3.org/ns/did/v1"]`
   - For each key in JWKS `keys` array:
     - Generate RFC 7638 JWK thumbprint for stable fragment identifier
     - Create verification method with `id: "{did}#{thumbprint}"`
     - Set `type: "JsonWebKey"`
     - Set `controller: {did}`
     - Set `publicKeyJwk` to the key
   - Populate `assertionMethod` and `authentication` with keys where `use: "sig"` (default if unspecified)
   - Populate `keyAgreement` with keys where `use: "enc"`

When resolution fails, the resolver returns a null DID document and an error in the DID resolution metadata (for example, `notFound`).

#### Discover the JWKS URI

1. Fetch the discovery document:
   - **Root DIDs**: `https://{domain}/.well-known/openid-configuration`
   - **Path DIDs**: `https://{domain}/.well-known/openid-configuration/{path}` (the [RFC 8414](https://www.rfc-editor.org/rfc/rfc8414) insertion form)
1. If the response is not a success, if the request fails, or if the body is not a JSON object, discovery fails. The resolver MUST NOT fetch a second discovery document. For path DIDs, it MUST NOT fetch the OpenID Connect Discovery 1.0 form (`https://{domain}/{path}/.well-known/openid-configuration`).
1. The `issuer` member MUST be present and MUST exactly equal the identity URL, compared as strings. If not, discovery fails.
1. The `jwks_uri` member MUST be present and MUST be an absolute `https` URL. If not, discovery fails. The `jwks_uri` MAY be on a different origin from the identity URL (see [jwks_uri Origin](#jwks_uri-origin)).
1. The result is the `jwks_uri`.

#### Discovery Mode Configuration

Discovery mode is a verifier setting for each identity. A verifier that uses discovery mode MUST name each DID that uses it, for example with a list of DIDs. The setting is local to the verifier. A resolver MUST NOT turn on discovery mode because of the DID string, a response from any host, or a failed fetch. A 404 never turns on discovery mode.

### Update

No updates possible. DID documents are dynamically generated from JWKS endpoints.

### Delete

No deletion possible. DID documents exist only as long as the underlying JWKS endpoint is available.

To deactivate a DID, the publisher removes the JWKS from the location that the DID resolves from. In strict mode, that is the fixed location. Resolution then fails, because a resolver never reads keys from a different location.

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

### Strict Resolution

Version 1 of this specification fetched the fixed JWKS location and, on a miss, fell back to OAuth2/OIDC discovery and its `jwks_uri`. That fallback made a miss widen the key set. A publisher that deletes `jwks.json` to revoke its keys expects the DID to stop resolving. With the fallback, a resolver silently read a different key set from the discovery document, and the revoked identity continued to resolve.

Version 2 removes the fallback. Each DID resolves from exactly one location, and a missing or malformed document ends resolution. This makes removal of the JWKS a dependable revocation action:

- In strict mode, the fixed location is the only key location.
- In discovery mode, the discovered `jwks_uri` is the only key location. It replaces the fixed location.
- Key sets from two locations are never combined. A union would stop key removal at either location from revoking.
- Neither location falls back to the other.

Discovery also added failure modes: more requests, and documents that can be malformed or inconsistent. Strict mode avoids them for every identity that a verifier does not opt in.

### Discovery Mode

Discovery mode exists for providers that publish keys only through a discovery `jwks_uri`. Only the verifier can turn it on, and only for the DIDs it names. An attacker who controls the DID string cannot make a resolver read a discovery document.

**Issuer check.** The discovery document's `issuer` MUST exactly equal the identity URL. This binds the document to the identity. It stops a document for one identity from supplying keys for another identity on the same host. It follows [RFC 8414](https://www.rfc-editor.org/rfc/rfc8414) section 3.3 and [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html) section 4.3. The comparison is exact: a trailing slash, a different scheme, or a different letter case makes the check fail.

**One discovery location.** For path DIDs, a resolver reads only the RFC 8414 insertion form. It does not read the OpenID Connect Discovery 1.0 path-append form, before or after a miss. A second lookup after a 404 is the same fallback that strict resolution removes. Because a resolver reads only one discovery document, two documents can never disagree. Providers that publish only the path-append form (for example, some realm-based identity servers) cannot use discovery mode for path DIDs.

#### jwks_uri Origin

This specification does not require the `jwks_uri` to be on the same origin as the identity URL. The `jwks_uri` MUST use `https`. The reasons are:

- **Major providers use a different origin.** `https://accounts.google.com` publishes its keys at `https://www.googleapis.com/oauth2/v3/certs`. A same-origin rule makes such identities unresolvable, and discovery mode exists to serve them.
- **The verifier makes an explicit trust decision.** Discovery mode applies only to identities that the verifier names. For those identities, the verifier trusts the discovery document, as an OIDC relying party does. RFC 8414 and OpenID Connect Discovery 1.0 do not require a same-origin `jwks_uri`.
- **A same-origin rule adds little protection.** The discovery document comes from the identity's origin over TLS, and its `issuer` must match. An attacker who can change that document controls the origin, and can also serve keys from that origin.
- **The resolver does not follow a `jwks_uri` for untrusted input.** An attacker-supplied DID always resolves in strict mode, so it cannot direct the resolver to an arbitrary `jwks_uri` host.

The cost is a larger trust base: the key set depends on DNS and TLS for both the identity origin and the `jwks_uri` origin. A compromise of either origin can substitute keys. A verifier MAY apply a stricter same-origin rule to some or all identities.

## Limitations

**Generated DID Documents**: Like `did:key` and `did:pkh`, the DID document is dynamically generated from the JWKS endpoint rather than being authored and stored. This means:

- **No Service Endpoints**: Cannot include service endpoints for DID-Comm, credential issuance, or other DID services
- **No Custom Controllers**: The controller field always matches the DID identifier - no support for external controllers or delegation
- **No Custom Verification Relationships**: All keys are automatically assigned to `authentication` and `assertionMethod` based on their `use` field - no fine-grained control over verification relationships
- **No Metadata**: Cannot include additional metadata like created/updated timestamps, proof chains, or custom properties

**Infrastructure Dependencies**:

- **DNS/Domain Control Required**: The DID is only as secure as the domain's DNS and TLS infrastructure
- **JWKS Endpoint Availability**: If the JWKS endpoint is down, the DID cannot be resolved
- **Discovery Needs Configuration**: Providers that publish keys only through a discovery `jwks_uri` resolve only after a verifier opts each identity in to discovery mode

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

- Full DID resolver with strict resolution by default and opt-in OAuth2/OIDC discovery for each DID
- Comprehensive JWKS and DID document validation schemas using Valibot
- Test vectors for major OAuth2 providers (Google, Auth0, GitHub, etc.)
- Integration with standard DID resolution libraries

## Test Vectors

The following test vectors demonstrate resolution for major OAuth2 providers:

### Google

- **DID**: `did:jwks:accounts.google.com`
- **Mode**: Discovery (opt-in). Strict mode fails: `https://accounts.google.com/.well-known/jwks.json` returns 404.
- **Discovery**: `https://accounts.google.com/.well-known/openid-configuration`
- **Issuer**: `https://accounts.google.com`
- **JWKS URI**: `https://www.googleapis.com/oauth2/v3/certs` (a different origin)

### Auth0

- **DID**: `did:jwks:example.auth0.com`
- **Mode**: Strict
- **Direct JWKS**: `https://example.auth0.com/.well-known/jwks.json`

### GitHub Actions

- **DID**: `did:jwks:token.actions.githubusercontent.com`
- **Mode**: Discovery (opt-in). Strict mode fails: `https://token.actions.githubusercontent.com/.well-known/jwks.json` returns 404.
- **Discovery**: `https://token.actions.githubusercontent.com/.well-known/openid-configuration`
- **Issuer**: `https://token.actions.githubusercontent.com`
- **JWKS URI**: `https://token.actions.githubusercontent.com/.well-known/jwks`

[Complete test vectors available in the repository]

---

## Changelog

### Version 2 (2026-10-16)

Breaking change to resolution.

- Resolution is strict by default. A resolver reads only the fixed JWKS location. A 404, a failed request, or a malformed document ends resolution.
- The fallback from the fixed location to OAuth2/OIDC discovery is removed. It let a miss at one location widen the key set, so deleting `jwks.json` did not revoke keys.
- OAuth2/OIDC discovery is an opt-in mode that the verifier configures for each DID. In this mode, the discovered `jwks_uri` replaces the fixed location.
- In discovery mode, the discovery document's `issuer` MUST exactly equal the identity URL, and the `jwks_uri` MUST use `https`. The `jwks_uri` MAY be on a different origin.
- In discovery mode, path DIDs read only the RFC 8414 insertion form.
- DIDs such as `did:jwks:accounts.google.com` and `did:jwks:token.actions.githubusercontent.com` now need discovery mode.

### Version 1

- Initial specification. Resolution read the fixed JWKS location and fell back to OAuth2/OIDC discovery on a miss.

---

## Appendix: Related Standards

- [RFC 7517 - JSON Web Key (JWK)](https://tools.ietf.org/html/rfc7517)
- [RFC 7518 - JSON Web Algorithms (JWA)](https://tools.ietf.org/html/rfc7518)
- [RFC 7638 - JSON Web Key (JWK) Thumbprint](https://tools.ietf.org/html/rfc7638)
- [RFC 8414 - OAuth 2.0 Authorization Server Metadata](https://tools.ietf.org/html/rfc8414)
- [RFC 8615 - Well-Known Uniform Resource Identifiers](https://tools.ietf.org/html/rfc8615)
- [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)
- [DID Core v1.0](https://www.w3.org/TR/did-core/)
- [DID Specification Registries](https://www.w3.org/TR/did-spec-registries/)
