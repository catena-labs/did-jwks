#!/usr/bin/env node
import { parseCliArgs } from "./cli-args"
import { isDidJwks } from "./did-jwks"
import { fetchJwksDidDocument } from "./fetch"

async function main() {
  const args = parseCliArgs(process.argv.slice(2))

  if (!args) {
    console.error("Usage: did-jwks [--discovery] <did>")
    console.error("Example: did-jwks did:jwks:example.auth0.com")
    console.error("Example: did-jwks --discovery did:jwks:accounts.google.com")
    console.error("")
    console.error(
      "--discovery  Read keys from the OAuth 2.0 / OIDC discovery jwks_uri"
    )
    console.error("             instead of the fixed JWKS location.")
    process.exit(1)
  }

  const { did, discovery } = args
  if (!isDidJwks(did)) {
    console.error("Invalid DID: ", did)
    process.exit(1)
  }

  const didDocument = await fetchJwksDidDocument(did, {
    allowedHttpHosts: ["localhost", "0.0.0.0"],
    discoveryDids: discovery ? [did] : []
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
