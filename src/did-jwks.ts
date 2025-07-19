import * as v from "valibot"
import {
  createDidSchema,
  DidSchema,
  type Did
} from "web-identity-schemas/valibot"

export const didJwksUriSchema = createDidSchema("jwks")

export function isDidUri(val: unknown): val is Did {
  return v.is(DidSchema, val)
}

export function isDidJwksUri(val: unknown): val is Did<"jwks"> {
  return v.is(didJwksUriSchema, val)
}
