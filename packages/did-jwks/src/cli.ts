#!/usr/bin/env node
import { isDidJwks } from "./did-jwks"
import { fetchJwksDidDocument } from "./fetch"

const USAGE = "Usage: did-jwks <did>"
const EXAMPLE = "Example: did-jwks did:jwks:accounts.google.com"

async function main() {
  let args = process.argv.slice(2)
  if (args[0] === "--") {
    args = args.slice(1)
  }

  if (args[0] === "--help" || args[0] === "-h") {
    console.log(USAGE)
    console.log(EXAMPLE)
    process.exit(0)
  }

  if (args.length !== 1) {
    console.error(USAGE)
    console.error(EXAMPLE)
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

  if (!didDocument) {
    console.error(`Error: Could not resolve DID ${did}`)
    process.exit(1)
  }

  console.log(JSON.stringify(didDocument, null, 2))
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
