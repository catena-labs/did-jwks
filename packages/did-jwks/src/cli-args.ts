export interface CliArgs {
  readonly did: string
  readonly jwksFallback: boolean
}

const NO_FALLBACK_FLAG = "--no-fallback"

/**
 * Parse `did-jwks [--no-fallback] <did>`.
 *
 * @returns The parsed arguments, or `null` if the arguments are not valid.
 */
export function parseCliArgs(argv: readonly string[]): CliArgs | null {
  const args = argv[0] === "--" ? argv.slice(1) : argv
  const jwksFallback = !args.includes(NO_FALLBACK_FLAG)
  const rest = args.filter((arg) => arg !== NO_FALLBACK_FLAG)
  const [did] = rest

  if (rest.length !== 1 || did === undefined || did.startsWith("-")) {
    return null
  }

  return { did, jwksFallback }
}
