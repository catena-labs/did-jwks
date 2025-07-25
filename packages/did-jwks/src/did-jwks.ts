import * as v from "valibot"
import type {
  Did,
  JsonWebKeySet,
  VerificationMethod
} from "web-identity-schemas"
import { DidDocumentSchema, UriSchema } from "web-identity-schemas/valibot"
import { isDidWithMethod } from "web-identity-schemas/valibot"
export { isDid } from "web-identity-schemas/valibot"

/**
 * Helper type predicate for `did:jwks` URIs.
 * @param val
 * @returns
 */
export const isDidJwks = (val: unknown) => isDidWithMethod("jwks", val)

/**
 * A minimal DidDocument schema with an array for @context, and no service
 * endpoints or controller.
 */
const MinimalDidDocumentSchema = v.object({
  ...v.omit(DidDocumentSchema, ["service", "controller"]).entries,
  "@context": v.array(UriSchema)
})

type DidDocument = v.InferOutput<typeof MinimalDidDocumentSchema>

/**
 * Create a DID document from a JWKS.
 *
 * @param didUri - The DID URI.
 * @param jwks - The JWKS.
 * @returns The DID document.
 */
export function createDidJwksDidDocument(
  did: Did<"jwks">,
  jwks: JsonWebKeySet
): DidDocument {
  const { verificationMethods, sigMethodIds, encMethodIds } = jwks.keys.reduce<{
    verificationMethods: VerificationMethod[]
    sigMethodIds: string[]
    encMethodIds: string[]
  }>(
    (acc, { kid, use, ...publicKeyJwk }, index) => {
      const keyId = kid ?? `key-${index}`
      const id = `${did}#${keyId}` as const

      acc.verificationMethods.push({
        id,
        type: "JsonWebKey",
        controller: did,
        publicKeyJwk
      })

      if (use === "enc") {
        acc.encMethodIds.push(id)
      } else {
        acc.sigMethodIds.push(id)
      }

      return acc
    },
    {
      verificationMethods: [],
      sigMethodIds: [],
      encMethodIds: []
    }
  )

  return v.parse(MinimalDidDocumentSchema, {
    "@context": ["https://www.w3.org/ns/did/v1"],
    id: did,
    verificationMethod: verificationMethods,
    assertionMethod: sigMethodIds,
    authentication: sigMethodIds,
    ...(encMethodIds.length > 0 && { keyAgreement: encMethodIds })
  })
}
