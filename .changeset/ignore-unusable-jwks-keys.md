---
"did-jwks": patch
---

Ignore JWKS keys that are not understood instead of failing the whole key set.

Before, the key set was validated as a whole, so one key that the schema did not accept made resolution fail for every key. This included any encryption key that declares a JWE `alg` (for example `ECDH-ES` or `RSA-OAEP`) and any newer key type (for example `AKP`). Per RFC 7517 section 5, each key is now checked on its own, keys that are not understood are left out of the DID document, and the other keys resolve. A key set in which no key is understood still fails to resolve (`notFound`).

An encryption key that declares a JWE `alg` is ignored. It is not added to `keyAgreement`, because the `web-identity-schemas` JWK schema accepts only JWS algorithms in `alg`. Mapping such keys to `keyAgreement` needs a change to that schema.
