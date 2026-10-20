---
"did-jwks": patch
"jwks-did-resolver": patch
---

Validate the `did:jwks` authority and path segments before resolution.

A DID that holds userinfo, a URL delimiter, an IP literal, a port on a host that is not in `allowedHttpHosts`, an empty or dot path segment, or malformed percent-encoding now rejects with `InvalidDidError`. No fetch occurs. `jwks-did-resolver` returns `invalidDid` for these DIDs, and the CLI prints the error message. Host names are lowercased. A decoded path character that is not an RFC 3986 `pchar`, such as `/`, `?`, `#`, a space or a tab, stays encoded inside its segment. `allowedHttpHosts` entries match without regard to case.
