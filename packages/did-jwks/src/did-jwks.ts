import * as v from "valibot"
import type {
  Did,
  JsonWebKeySet,
  VerificationMethod
} from "web-identity-schemas"
import { DidDocumentSchema, UriSchema } from "web-identity-schemas/valibot"
import { isDidWithMethod } from "web-identity-schemas/valibot"

import { generateJwkThumbprint } from "./utils/jwk-thumbprint"
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
export async function createDidJwksDidDocument(
  did: Did<"jwks">,
  jwks: JsonWebKeySet
): Promise<DidDocument> {
  // JWKS endpoints must only publish public keys. Symmetric (`oct`) keys
  // would leak the shared secret via `k`, and any key carrying private
  // material (`d`) would leak it via `publicKeyJwk`. Skip them instead.
  const usableKeys = jwks.keys.filter((key) => {
    if (key.kty === "oct") {
      return false
    }
    if ("d" in key) {
      return false
    }
    return true
  })

  const keysWithThumbprints = await Promise.all(
    usableKeys.map(async (key) => {
      const { use } = key
      const thumbprint = await generateJwkThumbprint(key)
      return {
        use,
        publicKeyJwk: key,
        thumbprint
      }
    })
  )

  const seenThumbprints = new Set<string>()
  const { verificationMethods, sigMethodIds, encMethodIds } =
    keysWithThumbprints.reduce<{
      verificationMethods: VerificationMethod[]
      sigMethodIds: string[]
      encMethodIds: string[]
    }>(
      (acc, { use, publicKeyJwk, thumbprint }) => {
        // Duplicate keys (same thumbprint) would create duplicate
        // verificationMethod ids, which is invalid. Keep the first.
        if (seenThumbprints.has(thumbprint)) {
          return acc
        }
        seenThumbprints.add(thumbprint)

        const id = `${did}#${thumbprint}` as const

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
