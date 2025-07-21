import * as v from "valibot"

export const OpenIDConfigurationSchema = v.object({
  jwks_uri: v.optional(v.pipe(v.string(), v.url()))
})

export type OpenIDConfiguration = v.InferOutput<
  typeof OpenIDConfigurationSchema
>
