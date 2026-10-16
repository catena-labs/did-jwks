import * as s from "standard-parse"
import { expect } from "vitest"
import type { Did } from "web-identity-schemas"
import {
  DidDocumentSchema,
  VerificationMethodJsonWebKeySchema
} from "web-identity-schemas/valibot"

export function expectJwksDidDocument(did: Did<"jwks">, didDocument: unknown) {
  expect(didDocument).toBeDefined()
  if (!didDocument) {
    return
  }

  expect(didDocument).toMatchSchema(DidDocumentSchema)
  if (!s.is(DidDocumentSchema, didDocument)) {
    return
  }

  expect(didDocument.id).toBe(did)

  // Check that verificationMethod is an array of VerificationMethod type
  expect(didDocument.verificationMethod).toBeInstanceOf(Array)
  expect(didDocument.verificationMethod!.length).toBeGreaterThan(0)

  // Type check each verification method using runtime property checks
  const verificationMethods = didDocument.verificationMethod
  verificationMethods?.forEach((vm) => {
    // Must be a JSON Web Key
    expect(vm).toMatchSchema(VerificationMethodJsonWebKeySchema)
  })

  // Split by use field: enc keys go to keyAgreement only
  const sigMethodIds =
    verificationMethods
      ?.filter((vm) => {
        const jwk = (vm as { publicKeyJwk?: { use?: string } }).publicKeyJwk
        return jwk?.use !== "enc"
      })
      .map((vm) => vm.id) ?? []

  const encMethodIds =
    verificationMethods
      ?.filter((vm) => {
        const jwk = (vm as { publicKeyJwk?: { use?: string } }).publicKeyJwk
        return jwk?.use === "enc"
      })
      .map((vm) => vm.id) ?? []

  expect(didDocument.assertionMethod).toEqual(sigMethodIds)
  expect(didDocument.authentication).toEqual(sigMethodIds)

  if (encMethodIds.length > 0) {
    expect(didDocument.keyAgreement).toEqual(encMethodIds)
  }
}
