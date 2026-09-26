---
"did-jwks": patch
---

fix: skip symmetric and private keys when building the DID document, dedupe identical thumbprints

JWKS endpoints must only publish public keys. Symmetric (`oct`) keys carry the shared secret in `k` and any key with `d` carries private material — including them in `verificationMethod.publicKeyJwk` would publish secrets in the DID document. They are now filtered out. Keys resolving to the same RFC 7638 thumbprint previously produced duplicate verification method ids; only the first is now kept.
