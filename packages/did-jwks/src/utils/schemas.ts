import * as v from "valibot"

/**
 * The OAuth 2.0 / OpenID Connect discovery members that `did:jwks` reads.
 * Both are required.
 */
export const OpenIDConfigurationSchema = v.object({
  issuer: v.string(),
  jwks_uri: v.pipe(v.string(), v.url())
})

/**
 * A JWK Set is an object with a `keys` array. The keys are not validated
 * here. Each key is checked on its own after the fetch, so one key that is
 * not understood does not make the whole set malformed.
 */
export const JwksKeysSchema = v.object({ keys: v.array(v.unknown()) })
