---
"did-jwks": patch
---

fix: enforce https/allowlist policy on OIDC-discovered jwks_uri

The base URL respects `allowedHttpHosts` (https everywhere except allowlisted hosts), but the `jwks_uri` taken from the OpenID configuration was fetched as-is — an `http://` URI for a non-allowlisted host, a `userinfo@host` URI, or a non-http(s) URI would all be fetched. Discovered URIs now require https unless their hostname is allowlisted, and userinfo/non-http(s) URIs are refused.
