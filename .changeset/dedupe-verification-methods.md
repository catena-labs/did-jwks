---
"did-jwks": patch
---

Deduplicate verification methods by JWK thumbprint. Two keys with the same key material but a different `kid` or `alg` have the same RFC 7638 thumbprint, so they produced two verification methods with the same `id`. The first key with each thumbprint is kept.
