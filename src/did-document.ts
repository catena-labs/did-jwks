import type { DIDDocument } from "did-resolver"
import * as v from "valibot"
import type {
  Did,
  JsonWebKeySet,
  VerificationMethod
} from "web-identity-schemas"
import { DidDocumentSchema, UriSchema } from "web-identity-schemas/valibot"

/**
 * A minimal DidDocument schema with an array for @context, and no service
 * endpoints or controller.
 */
const MinimalDidDocumentSchema = v.object({
  ...v.omit(DidDocumentSchema, ["service", "controller"]).entries,
  "@context": v.array(UriSchema)
})

/**
 * Create a DID document from a JWKS.
 *
 * @param didUri - The DID URI.
 * @param jwks - The JWKS.
 * @returns The DID document.
 */
export function createDidDocument(
  didUri: Did,
  jwks: JsonWebKeySet
): DIDDocument {
  const { verificationMethods, sigMethodIds, encMethodIds } = jwks.keys.reduce<{
    verificationMethods: VerificationMethod[]
    sigMethodIds: string[]
    encMethodIds: string[]
  }>(
    (acc, { kid, use, ...publicKeyJwk }, index) => {
      const keyId = kid ?? `key-${index}`
      const id = `${didUri}#${keyId}` as const

      acc.verificationMethods.push({
        id,
        type: "JsonWebKey",
        controller: didUri,
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
    id: didUri,
    verificationMethod: verificationMethods,
    assertionMethod: sigMethodIds,
    authentication: sigMethodIds,
    ...(encMethodIds.length > 0 && { keyAgreement: encMethodIds })
  })
}
