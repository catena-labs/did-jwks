---
"did-jwks": patch
"jwks-did-resolver": patch
---

Validate the `did:jwks` authority and path segments before resolution.

A DID that holds userinfo, a URL delimiter, an IP literal, a port on a host that is not in `allowedHttpHosts`, a dot segment, or malformed percent-encoding now rejects with `InvalidDidError`. No fetch occurs. `jwks-did-resolver` returns `invalidDid` for these DIDs. Host names are lowercased, and a decoded `/` stays inside its path segment.
