---
"jwks-did-resolver": patch
"did-jwks": patch
---

Reject `.` and `..` path segments in a `did:jwks` DID instead of letting them escape its own path during resolution. Previously `did:jwks:example.com:..:..:secret` and `did:jwks:example.com:secret` could resolve to the same URL, letting distinct DIDs alias to the same key set; the two internal URL builders also disagreed about the resulting path, since one normalized dot segments away (via `new URL()`) and the other did not.
