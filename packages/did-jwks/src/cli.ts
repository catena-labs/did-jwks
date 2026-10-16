#!/usr/bin/env node
import { isDidJwks } from "./did-jwks"
import { fetchJwksDidDocument } from "./fetch"

export const DEFAULT_ALLOWED_HTTP_HOSTS = ["localhost", "0.0.0.0"]

export interface CliArgs {
  readonly did: string | undefined
  readonly allowedHttpHosts: string[]
  readonly help: boolean
  readonly invalid: boolean
}

/**
 * Parse CLI arguments.
 *
 * Supports `did-jwks [--allow-http=<host,...>] [--help] <did>` plus the
 * `DID_JWKS_ALLOW_HTTP_HOSTS` env var (comma-separated) for extra
 * http-allowed hosts. A lone `--` separator (e.g. via pnpm) is ignored.
 */
export function parseArgs(
  argv: readonly string[],
  env: NodeJS.ProcessEnv = process.env
): CliArgs {
  const allowedHttpHosts = [...DEFAULT_ALLOWED_HTTP_HOSTS]

  const envHosts = (env.DID_JWKS_ALLOW_HTTP_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter((host) => host.length > 0)
  for (const host of envHosts) {
    if (!allowedHttpHosts.includes(host)) {
      allowedHttpHosts.push(host)
    }
  }

  let help = false
  let invalid = false
  const positionals: string[] = []

  const args = [...argv]
  if (args[0] === "--") {
    args.shift()
  }

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      help = true
    } else if (arg.startsWith("--allow-http=")) {
      const hosts = arg
        .slice("--allow-http=".length)
        .split(",")
        .map((host) => host.trim())
        .filter((host) => host.length > 0)
      for (const host of hosts) {
        if (!allowedHttpHosts.includes(host)) {
          allowedHttpHosts.push(host)
        }
      }
    } else if (arg.startsWith("--")) {
      invalid = true
    } else {
      positionals.push(arg)
    }
  }

  if (positionals.length > 1) {
    invalid = true
  }

  return { did: positionals[0], allowedHttpHosts, help, invalid }
}

const USAGE = [
  "Usage: did-jwks [--allow-http=<host,...>] [--help] <did>",
  "Example: did-jwks did:jwks:accounts.google.com",
  "Env: DID_JWKS_ALLOW_HTTP_HOSTS=host1,host2 allows http for extra hosts"
]

function printUsage(stream: "out" | "err" = "err") {
  const print = stream === "out" ? console.log : console.error
  for (const line of USAGE) {
    print(line)
  }
}

async function main() {
  const { did, allowedHttpHosts, help, invalid } = parseArgs(
    process.argv.slice(2)
  )

  if (help) {
    printUsage("out")
    process.exit(0)
  }

  if (invalid || did === undefined) {
    printUsage()
    process.exit(1)
  }

  if (!isDidJwks(did)) {
    console.error(`Invalid DID: ${did}`)
    process.exit(1)
  }

  const didDocument = await fetchJwksDidDocument(did, {
    allowedHttpHosts
  })

  if (!didDocument) {
    console.error(`Error: Could not resolve DID ${did}`)
    process.exit(1)
  }

  console.log(JSON.stringify(didDocument, null, 2))
}

if (!process.env.VITEST_WORKER_ID) {
  main().catch((error: unknown) => {
    console.error(
      `Fatal error: ${error instanceof Error ? error.message : error}`
    )
    process.exit(1)
  })
}
