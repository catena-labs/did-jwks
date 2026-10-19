---
"did-jwks": major
"jwks-did-resolver": major
---

Resolve `did:jwks` keys through OAuth2/OIDC discovery first.

Resolution now reads the discovery document first. When it is valid, its `jwks_uri` is the only key location, and `jwks.json` is never read. Only a discovery 404 selects the `jwks.json` fallback. Any other discovery failure ends resolution, and a miss at the selected location never moves to another location. Key sets from two locations are never combined.

Before, resolution read `jwks.json` first and fell back to discovery on any failure. A publisher that deleted `jwks.json` to revoke its keys could then have a resolver read a different key set from the discovery document.

Other changes:

- The discovery `issuer` must equal the DID's URL, with one terminating `/` allowed (RFC 8414 section 3.1).
- The `jwks_uri` must use `https` and must not carry userinfo. It may be on a different origin.
- Redirects are followed one hop at a time, up to 5. A redirect to an `http` URL at any hop fails, on every fetch. It never counts as a discovery 404.
- A JWKS with an empty `keys` array fails to resolve (`notFound`).
- Path DIDs read only the RFC 8414 insertion form of the discovery document.
- New `jwksFallback` option (default `true`). Set it to `false` for discovery-only resolution. The CLI has a matching `--no-fallback` flag.

Migration: a host that publishes both a discovery document and `jwks.json` now resolves to the `jwks_uri` key set. A host whose discovery document fails the `issuer` or `jwks_uri` check no longer resolves. A host that relies on `jwks.json` must return 404 for its discovery URL.
