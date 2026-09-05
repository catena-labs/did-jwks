---
"did-jwks": patch
---

Validate the jwks_uri discovered via OAuth2/OIDC discovery. Only https is followed, unless the host is listed in allowedHttpHosts. Other schemes are rejected, and the same check is re-applied to the URL the response came from so a redirect cannot downgrade the transport.
