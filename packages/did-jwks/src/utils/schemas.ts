import * as v from "valibot"

/**
 * The OAuth 2.0 / OpenID Connect discovery members that `did:jwks` reads.
 * Both are required in discovery mode.
 */
export const OpenIDConfigurationSchema = v.object({
  issuer: v.string(),
  jwks_uri: v.pipe(v.string(), v.url())
})
