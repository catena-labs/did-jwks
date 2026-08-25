---
"jwks-did-resolver": patch
"did-jwks": patch
---

Skip symmetric (`kty: "oct"`) keys when building a DID document from a JWKS instead of emitting them as `publicKeyJwk`. A DID document is public, so including a symmetric key would leak secret key material or mislead consumers into treating a shared secret as a public key. A JWKS containing only symmetric keys now resolves to a DID document with no verification methods, rather than throwing.
