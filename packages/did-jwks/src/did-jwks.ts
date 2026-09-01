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
  const keysWithThumbprints = await Promise.all(
    jwks.keys.map(async (key) => {
      const { use } = key
      const thumbprint = await generateJwkThumbprint(key)
      return {
        use,
        publicKeyJwk: key,
        thumbprint
      }
    })
  )

  // RFC 7638 thumbprints are computed only from required key-type members
  // (e.g. kty/n/e for RSA), so two keys with identical key material but
  // different `kid`/`alg` produce the same thumbprint. Without deduplication
  // that yields two verification methods sharing the same `id`, violating
  // the DID Core requirement that verification method ids be unique. Keep
  // only the first occurrence of each thumbprint.
  const seenThumbprints = new Set<string>()
  const dedupedKeys = keysWithThumbprints.filter(({ thumbprint }) => {
    if (seenThumbprints.has(thumbprint)) {
      return false
    }
    seenThumbprints.add(thumbprint)
    return true
  })

  const { verificationMethods, sigMethodIds, encMethodIds } =
    dedupedKeys.reduce<{
      verificationMethods: VerificationMethod[]
      sigMethodIds: string[]
      encMethodIds: string[]
    }>(
      (acc, { use, publicKeyJwk, thumbprint }) => {
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
