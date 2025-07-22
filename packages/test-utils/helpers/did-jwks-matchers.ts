import type { Did } from "web-identity-schemas"
import { expect } from "vitest"
import {
  DidDocumentSchema,
  VerificationMethodJsonWebKeySchema
} from "web-identity-schemas/valibot"
import * as s from "standard-parse"

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

  // Check assertion and authentication methods reference the verification methods
  expect(didDocument.assertionMethod).toEqual(
    verificationMethods?.map((vm) => vm.id) ?? []
  )
  expect(didDocument.authentication).toEqual(
    verificationMethods?.map((vm) => vm.id) ?? []
  )
}
