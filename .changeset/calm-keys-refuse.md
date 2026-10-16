---
"did-jwks": patch
---

fix: treat a keyless JWKS as unresolvable and fall back to discovery for empty direct endpoints

A JWKS of `{"keys": []}` parsed successfully and produced a DID document with empty `verificationMethod`, `assertionMethod`, and `authentication` arrays — a document that resolves "successfully" but cannot verify anything. `fetchJwksDidDocument` now returns `null` (surfacing as `notFound` through the resolver) when no keys are available. An empty JWKS at the direct `/.well-known/jwks.json` endpoint now falls through to OIDC discovery, since an empty key set there is usually a misconfigured or mid-rotation endpoint while discovery still points at the canonical key set.
