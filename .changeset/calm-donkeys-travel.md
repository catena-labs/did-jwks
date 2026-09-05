---
"did-jwks": patch
---

Reject did:jwks identifiers whose pct-encoded method-specific-id decodes to URL userinfo (e.g. did:jwks:good.com%40evil.com), which previously redirected resolution to a different host and could trick allowedHttpHosts into granting http to it
