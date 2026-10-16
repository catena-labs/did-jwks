---
"did-jwks": major
"jwks-did-resolver": major
---

Make `did:jwks` resolution strict by default.

Resolution now reads exactly one location: the fixed JWKS path. A 404, a network error or a malformed document fails resolution. The resolver no longer falls back to OAuth2/OIDC discovery, because that fallback let a resolver read a different key set after a publisher deleted `jwks.json` to revoke its keys.

OAuth2/OIDC discovery is now opt-in for each DID with the new `discoveryDids` option. For a listed DID, the discovered `jwks_uri` replaces the fixed path. The discovery document's `issuer` must exactly equal the DID's URL, and the `jwks_uri` must use `https`.

To migrate, add each DID that publishes keys only through discovery (for example, `did:jwks:accounts.google.com` or `did:jwks:token.actions.githubusercontent.com`) to `discoveryDids`:

```ts
getResolver({ discoveryDids: ["did:jwks:accounts.google.com"] })
```

The CLI has a new `--discovery` flag for the same purpose.
