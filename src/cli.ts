#!/usr/bin/env node
import { Resolver } from "did-resolver"
import { getResolver } from "./resolver"
import { isDidJwksUri } from "./did-jwks"

async function main() {
  const args = process.argv.slice(2)

  if (args.length !== 1) {
    console.error("Usage: did-jwks <did>")
    console.error("Example: did-jwks did:jwks:accounts.google.com")
    process.exit(1)
  }

  const did = args[0]
  if (!isDidJwksUri(did)) {
    console.error("Invalid DID: ", did)
    process.exit(1)
  }

  const didJwksResolver = getResolver({
    allowedHttpHosts: ["localhost", "0.0.0.0"]
  })
  const resolver = new Resolver(didJwksResolver)
  const doc = await resolver.resolve(did)

  console.log(JSON.stringify(doc, null, 2))
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
