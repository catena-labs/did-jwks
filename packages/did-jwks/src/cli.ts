#!/usr/bin/env node
import { isDidJwks } from "./did-jwks"
import { fetchJwksDidDocument } from "./fetch"

async function main() {
  const args = process.argv.slice(2)

  if (args.length !== 1) {
    console.error("Usage: did-jwks <did>")
    console.error("Example: did-jwks did:jwks:accounts.google.com")
    process.exit(1)
  }

  const did = args[0]
  if (!isDidJwks(did)) {
    console.error("Invalid DID: ", did)
    process.exit(1)
  }

  const didDocument = await fetchJwksDidDocument(did, {
    allowedHttpHosts: ["localhost", "0.0.0.0"]
  })

  console.log(JSON.stringify(didDocument, null, 2))
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
