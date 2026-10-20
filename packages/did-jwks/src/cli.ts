#!/usr/bin/env node
import { InvalidDidError } from "./base-url"
import { parseCliArgs } from "./cli-args"
import { isDidJwks } from "./did-jwks"
import { fetchJwksDidDocument } from "./fetch"

function printUsage() {
  console.error("Usage: did-jwks [--no-fallback] <did>")
  console.error("Example: did-jwks did:jwks:accounts.google.com")
  console.error("")
  console.error(
    "--no-fallback  Do not read jwks.json when the discovery document"
  )
  console.error("               returns 404 (discovery-only resolution).")
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2))

  if (!args) {
    printUsage()
    process.exit(1)
  }

  const { did, jwksFallback } = args
  if (!isDidJwks(did)) {
    console.error("Invalid DID: ", did)
    process.exit(1)
  }

  const didDocument = await fetchJwksDidDocument(did, {
    allowedHttpHosts: ["localhost", "0.0.0.0"],
    jwksFallback
  })

  if (!didDocument) {
    console.error(`Error: Could not resolve DID ${did}`)
    process.exit(1)
  }

  console.log(JSON.stringify(didDocument, null, 2))
}

main().catch((error: unknown) => {
  if (error instanceof InvalidDidError) {
    console.error(`Error: ${error.message}`)
  } else {
    console.error("Fatal error:", error)
  }
  process.exit(1)
})
