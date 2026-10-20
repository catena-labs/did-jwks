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

1. **Zero Migration Cost**: Providers that publish an OAuth2/OIDC discovery document, or a JWKS file at the fallback location, become DID-compatible without infrastructure changes or new endpoints.

1. **Explicit Semantics**: Replace ambiguous key discovery with deterministic resolution. `did:jwks:example.com` resolves to exactly one JWKS location, and every resolver selects the same location.

1. **One Key Location**: A resolver reads keys from one location. When a discovery document exists, its `jwks_uri` is the only key location. A miss at the selected location never moves resolution to another location.

1. **Standard OAuth2 Compatibility**: OAuth2/OIDC discovery is the primary mechanism, because major providers publish keys through `jwks_uri`. A direct JWKS file serves hosts that have no discovery document.

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

1. **Parse Path**: Convert colons (`:`) in the path to forward slashes (`/`). This gives the _identity URL_: `https://{domain}` for root DIDs and `https://{domain}/{path}` for path DIDs.
1. **OAuth2/OIDC Discovery**: Fetch the discovery document:
   - **Root DIDs**: `https://{domain}/.well-known/openid-configuration`
   - **Path DIDs**: Per [RFC 8414](https://www.rfc-editor.org/rfc/rfc8414), `https://{domain}/.well-known/openid-configuration/{path}`
1. **Select one key location**:
   - If the discovery document is valid, the key location is its `jwks_uri`.
   - If the discovery document returns 404, the key location is the fallback JWKS file: `https://{domain}/.well-known/jwks.json` for root DIDs, or `https://{domain}/{path}/jwks.json` for path DIDs.
   - For any other discovery result, resolution fails.
1. **Fetch JWKS** from the selected location. If it is missing or malformed, resolution fails. A resolver MUST NOT try another location.
1. **Transform**: Convert the JWKS to DID document format.

> **Note**: Per [RFC 8615](https://www.rfc-editor.org/rfc/rfc8615), `.well-known` URIs are only defined at the root of the path hierarchy. Root DIDs use standard `.well-known` paths. Path DIDs use [RFC 8414](https://www.rfc-editor.org/rfc/rfc8414)-style discovery for OAuth2/OIDC metadata, where `.well-known` is inserted between the origin and path to remain at the root, and direct file paths for the fallback JWKS.

### Examples

|   Provider    |                 DID Identifier                 |    Key Location From    |                          Resolves To                           |
| :-----------: | :--------------------------------------------: | :---------------------: | :------------------------------------------------------------: |
|    Google     |         `did:jwks:accounts.google.com`         |        Discovery        |          `https://www.googleapis.com/oauth2/v3/certs`          |
|    GitHub     | `did:jwks:token.actions.githubusercontent.com` |        Discovery        | `https://token.actions.githubusercontent.com/.well-known/jwks` |
|     Auth0     |          `did:jwks:example.auth0.com`          |        Discovery        |       `https://example.auth0.com/.well-known/jwks.json`        |
| Corporate SSO |           `did:jwks:sso.company.com`           | Fallback (no discovery) |        `https://sso.company.com/.well-known/jwks.json`         |
| With Subpath  |         `did:jwks:example.com:api:v1`          | Fallback (no discovery) |             `https://example.com/api/v1/jwks.json`             |
|  Tenant Path  |     `did:jwks:auth.example.com:tenant123`      | Fallback (no discovery) |         `https://auth.example.com/tenant123/jwks.json`         |

The fallback rows assume that the host returns 404 for the discovery document. If the host publishes a valid discovery document, its `jwks_uri` is the key location instead.

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
1. **Discover the JWKS URI** (see below). The result is _found_ with a `jwks_uri`, _missing_, or _invalid_.
1. **Select the key location**. Select exactly one location:
   - If the result is _found_, the location is the `jwks_uri`.
   - If the result is _missing_, the location is the fallback JWKS file:
     - **Root DIDs** (no path): `https://{domain}/.well-known/jwks.json`
     - **Path DIDs**: `https://{domain}/{path}/jwks.json`
   - If the result is _invalid_, resolution fails.
1. **Fetch the JWKS** from the selected location. If the response is not a success, if the request fails, or if the body is not a valid JWKS, resolution fails. A JWKS with an empty `keys` array is not valid. The resolver MUST NOT fetch keys from any other location. In particular, it MUST NOT fetch the fallback JWKS file after a `jwks_uri` miss.
1. **Generate DID Document**:
   - Set `id` to _did_
   - Set `@context` to `["https://www.w3.org/ns/did/v1"]`
   - For each key in JWKS `keys` array:
     - Generate RFC 7638 JWK thumbprint for stable fragment identifier
     - Create verification method with `id: "{did}#{thumbprint}"`
     - Set `type: "JsonWebKey"`
     - Set `controller: {did}`
     - Set `publicKeyJwk` to the key
   - Emit one verification method per thumbprint. The thumbprint covers only the required members of the key, so a key set can list the same key more than once (for example, with a different `kid` or `alg`). The first such key in `keys` order supplies `publicKeyJwk`, and each verification relationship lists the id at most once. The optional members of a later duplicate, such as its `kid` or `alg`, do not appear in the DID Document, so a verifier SHOULD select a verification method by its thumbprint fragment, not by `publicKeyJwk.kid`
   - Populate `assertionMethod` and `authentication` with keys where `use: "sig"` (default if unspecified)
   - Populate `keyAgreement` with keys where `use: "enc"`

When resolution fails, the resolver returns a null DID document and an error in the DID resolution metadata (for example, `notFound`).

Every fetch uses `https`. If a resolver follows redirects, every URL in the redirect chain MUST use `https`, and the resolver MUST check each hop before it fetches it. A resolver that cannot see each hop (for example, a browser `fetch`) MUST NOT follow redirects. A resolver SHOULD limit a chain to 5 redirects. A redirect to an `http` URL, at any hop, is a failure: for the discovery document, the result is _invalid_, never _missing_.

#### Discover the JWKS URI

1. Fetch the discovery document:
   - **Root DIDs**: `https://{domain}/.well-known/openid-configuration`
   - **Path DIDs**: `https://{domain}/.well-known/openid-configuration/{path}` (the [RFC 8414](https://www.rfc-editor.org/rfc/rfc8414) insertion form)
1. If the response status is 404, the result is _missing_.
1. If the request fails, the resolution fails.
1. If the response has any other status that is not a success, or if the body is not a JSON object, the result is _invalid_.
1. The `issuer` member MUST be present. It MUST equal the identity URL, or the identity URL followed by one `/`, compared as strings. If not, the result is _invalid_.
1. The `jwks_uri` member MUST be present and MUST be an absolute `https` URL with no userinfo component. If not, the result is _invalid_. The `jwks_uri` MAY be on a different origin from the identity URL (see [jwks_uri Origin](#jwks_uri-origin)).
1. Otherwise, the result is _found_ with the `jwks_uri`.

A resolver MUST NOT fetch a second discovery document. For path DIDs, it MUST NOT fetch the OpenID Connect Discovery 1.0 form (`https://{domain}/{path}/.well-known/openid-configuration`).

#### Discovery-Only Resolution

A resolver MAY let a verifier turn off the fallback JWKS file. In that case, a _missing_ result makes resolution fail. This setting never changes the key set that a DID resolves to. It can only make resolution fail where the default resolution succeeds.

### Update

No updates possible. DID documents are dynamically generated from JWKS endpoints.

### Delete

No deletion possible. DID documents exist only as long as the underlying JWKS endpoint is available.

To deactivate a DID, the publisher removes the JWKS from the location that the DID resolves from:

- **A host with a discovery document**: remove the keys from the `jwks_uri`, or remove both the discovery document and any fallback JWKS file. Removal of only the discovery document makes resolvers read the fallback JWKS file, if one exists.
- **A host without a discovery document**: remove the fallback JWKS file.

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

### One Key Location

Version 1 of this specification fetched the JWKS file first and, on any miss, fell back to OAuth2/OIDC discovery and its `jwks_uri`. That fallback let a miss widen the key set. A publisher that deletes `jwks.json` to revoke its keys expects the DID to stop resolving. With the fallback, a resolver silently read a different key set from the discovery document.

Version 2 reads the discovery document first:

- When a valid discovery document exists, its `jwks_uri` is the only key location. The resolver never reads the fallback JWKS file, so a stale `jwks.json` has no effect.
- A miss at the selected location ends resolution. It never moves resolution to another location.
- Key sets from two locations are never combined. A union would stop key removal at either location from revoking.
- Every resolver selects the same location for the same DID, without configuration.

### Fallback Scope

Version 2 keeps one fallback: a discovery 404 selects the fallback JWKS file. This lets hosts without a discovery document publish keys with one static file.

The fallback is narrow. Only a 404 selects it. A failed request, any other error status, a body that is not JSON, a missing member, or a failed check ends resolution. Thus a server error or a misconfigured discovery document never moves resolution to a different key set.

The fallback has one remaining risk. If a host removes its discovery document and still serves a stale fallback JWKS file, resolvers read the stale keys. Hosts that publish a discovery document SHOULD NOT also serve a fallback JWKS file with different keys. To deactivate a DID, follow the steps in [Delete](#delete).

Hosts that rely on the fallback MUST return 404 for the discovery URL. Some static hosts return 403 for a missing file, or return an HTML page with status 200 for every path. On such hosts, resolution fails.

A verifier that does not accept the fallback can use [discovery-only resolution](#discovery-only-resolution).

### Issuer Check

The discovery document's `issuer` MUST equal the identity URL. This binds the document to the identity, and it stops a document for one identity from supplying keys for another identity on the same host. It follows [RFC 8414](https://www.rfc-editor.org/rfc/rfc8414) section 3.3 and [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html) section 4.3.

The comparison allows one terminating `/`. RFC 8414 section 3.1 removes a terminating `/` from the issuer before it builds the discovery URL, so `https://example.com` and `https://example.com/` have the same discovery document. Auth0, for example, publishes its issuer with a terminating `/`. Any other difference makes the check fail: a different scheme, a different letter case, a different path, or more than one `/`.

### One Discovery Location

For path DIDs, a resolver reads only the RFC 8414 insertion form. It does not read the OpenID Connect Discovery 1.0 path-append form, so two discovery documents can never disagree. Providers that publish only the path-append form (for example, Microsoft Entra ID tenants and some realm-based identity servers) do not resolve through discovery.

### jwks_uri Origin

This specification does not require the `jwks_uri` to be on the same origin as the identity URL. The `jwks_uri` MUST use `https`. The reasons are:

- **Major providers use a different origin.** `https://accounts.google.com` publishes its keys at `https://www.googleapis.com/oauth2/v3/certs`. A same-origin rule makes such identities unresolvable.
- **OAuth2 and OIDC do not require it.** RFC 8414 and OpenID Connect Discovery 1.0 allow a `jwks_uri` on any origin, and OIDC relying parties already accept it.
- **A same-origin rule adds little protection against key substitution.** The discovery document comes from the identity's origin over TLS, and its `issuer` must match. An attacker who can change that document controls the origin, and can also serve keys from that origin.
- **A same-origin rule does not stop server-side request forgery.** An attacker who controls a DID's domain can point that domain's DNS at an internal address. A resolver that accepts untrusted DIDs needs address checks on every fetch, whatever the `jwks_uri` origin is.

The cost is a larger trust base: the key set depends on DNS and TLS for both the identity origin and the `jwks_uri` origin. A compromise of either origin can substitute keys. A verifier MAY apply a stricter same-origin rule.

## Limitations

**Generated DID Documents**: Like `did:key` and `did:pkh`, the DID document is dynamically generated from the JWKS endpoint rather than being authored and stored. This means:

- **No Service Endpoints**: Cannot include service endpoints for DID-Comm, credential issuance, or other DID services
- **No Custom Controllers**: The controller field always matches the DID identifier - no support for external controllers or delegation
- **No Custom Verification Relationships**: All keys are automatically assigned to `authentication` and `assertionMethod` based on their `use` field - no fine-grained control over verification relationships
- **No Metadata**: Cannot include additional metadata like created/updated timestamps, proof chains, or custom properties

**Infrastructure Dependencies**:

- **DNS/Domain Control Required**: The DID is only as secure as the domain's DNS and TLS infrastructure
- **JWKS Endpoint Availability**: If the JWKS endpoint is down, the DID cannot be resolved
- **Two Requests**: Every resolution fetches a discovery document first. Hosts without one need a second request for the fallback JWKS file
- **Insertion Form Only**: Providers that publish only the path-append discovery form do not resolve through discovery

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

- Full DID resolver with discovery-first resolution, a 404-only fallback to the JWKS file, and an option for discovery-only resolution
- Comprehensive JWKS and DID document validation schemas using Valibot
- Test vectors for major OAuth2 providers (Google, Auth0, GitHub, etc.)
- Integration with standard DID resolution libraries

## Test Vectors

The following test vectors demonstrate resolution for major OAuth2 providers:

### Google

- **DID**: `did:jwks:accounts.google.com`
- **Discovery**: `https://accounts.google.com/.well-known/openid-configuration`
- **Issuer**: `https://accounts.google.com`
- **JWKS URI**: `https://www.googleapis.com/oauth2/v3/certs` (a different origin)

### Auth0

- **DID**: `did:jwks:example.auth0.com`
- **Discovery**: `https://example.auth0.com/.well-known/openid-configuration`
- **Issuer**: `https://example.auth0.com/` (one terminating `/`)
- **JWKS URI**: `https://example.auth0.com/.well-known/jwks.json`

### GitHub Actions

- **DID**: `did:jwks:token.actions.githubusercontent.com`
- **Discovery**: `https://token.actions.githubusercontent.com/.well-known/openid-configuration`
- **Issuer**: `https://token.actions.githubusercontent.com`
- **JWKS URI**: `https://token.actions.githubusercontent.com/.well-known/jwks`

[Complete test vectors available in the repository]

---

## Changelog

### Version 2 (2026-10-16)

Breaking change to resolution.

- Resolution reads the OAuth2/OIDC discovery document first. When it is valid, its `jwks_uri` is the only key location, and the JWKS file is never read.
- The JWKS file is a fallback only when the discovery document returns 404. Any other discovery failure ends resolution.
- A miss at the selected location ends resolution. Key sets from two locations are never combined.
- The discovery `issuer` MUST equal the identity URL, with one terminating `/` allowed. The `jwks_uri` MUST use `https`, MUST NOT carry userinfo, and MAY be on a different origin.
- A redirect to an `http` URL, at any hop of the chain, is a failure, and never counts as a discovery 404.
- A JWKS with an empty `keys` array is malformed, so resolution fails.
- Path DIDs read only the RFC 8414 insertion form of the discovery document.
- Resolvers MAY offer discovery-only resolution, which turns off the fallback.
- Reason: version 1 read the JWKS file first and fell back to discovery on any miss. Deleting `jwks.json` then did not revoke keys, because resolvers read a different key set from the discovery document.

### Version 1

- Initial specification. Resolution read the JWKS file and fell back to OAuth2/OIDC discovery on any miss.

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
