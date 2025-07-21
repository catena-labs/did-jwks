import type { MatcherResult } from "bun:test"
import { expect } from "bun:test"
import * as s from "standard-parse"
import type { Did } from "web-identity-schemas"
import type { DIDDocument } from "did-resolver"
import {
  DidDocumentSchema,
  VerificationMethodJsonWebKeySchema
} from "web-identity-schemas/valibot"

interface StandardSchemaTestMatchers {
  toMatchSchema<TOutput>(
    schema: s.Schema<unknown, TOutput>,
    additionalChecks?: (parsed: TOutput) => void
  ): void
}

declare module "bun:test" {
  interface Matchers extends StandardSchemaTestMatchers {}
  interface AsymmetricMatchers extends StandardSchemaTestMatchers {}
}

function toMatchSchema<TOutput>(
  this: unknown, // MatcherContext
  received: unknown,
  schema: s.Schema<unknown, TOutput>,
  additionalChecks?: (parsed: TOutput) => void
): MatcherResult {
  const result = s.safeParse(schema, received)

  if (result.issues) {
    return {
      pass: false,
      message: () =>
        `Expected ${JSON.stringify(received)} to match schema.\n${formatIssues(result.issues)}`
    }
  }

  if (additionalChecks) {
    additionalChecks(result.value)
  }

  return {
    pass: true,
    message: () => `Expected ${JSON.stringify(received)} not to match schema`
  }
}

function formatIssues(issues: readonly s.Issue[]): string {
  return issues
    .map((issue) => {
      const pathKeys = issue.path?.map((p) =>
        typeof p === "object" ? p.key : p
      )
      const path = pathKeys ? `${pathKeys.join(".")}:` : ""
      return `  - ${path} ${issue.message}`
    })
    .join("\n")
}

expect.extend({
  toMatchSchema
})

export function expectJwksDidDocument(
  did: Did<"jwks">,
  didDocument: DIDDocument | null
) {
  expect(didDocument).toBeDefined()
  if (!didDocument) {
    return
  }

  expect(didDocument).toMatchSchema(DidDocumentSchema)
  expect(didDocument.id).toBe(did)

  // Check that verificationMethod is an array of VerificationMethod type
  expect(didDocument.verificationMethod).toBeInstanceOf(Array)
  expect(didDocument.verificationMethod!.length).toBeGreaterThan(0)

  // Type check each verification method using runtime property checks
  const verificationMethods = didDocument.verificationMethod
  verificationMethods?.forEach((vm) => {
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
