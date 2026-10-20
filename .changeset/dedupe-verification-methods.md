---
"did-jwks": patch
---

Emit one verification method per JWK thumbprint.

A JWKS can list the same key material more than once, for example with a different `kid` or `alg`. The RFC 7638 thumbprint ignores those members, so the DID document repeated the same verification method id, and repeated it in `authentication`, `assertionMethod` and `keyAgreement`. DID Core requires unique ids. The first key in `keys` order now supplies the verification method, and each relationship lists its id once. Key material listed with both `use: "sig"` and `use: "enc"` keeps both relationships.

The optional members of a later duplicate, such as its `kid` or `alg`, no longer appear in the DID document. Select a verification method by its thumbprint fragment, not by `publicKeyJwk.kid`.
