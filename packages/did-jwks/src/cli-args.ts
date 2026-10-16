export interface CliArgs {
  readonly did: string
  readonly discovery: boolean
}

const DISCOVERY_FLAG = "--discovery"

/**
 * Parse `did-jwks [--discovery] <did>`.
 *
 * @returns The parsed arguments, or `null` if the arguments are not valid.
 */
export function parseCliArgs(argv: readonly string[]): CliArgs | null {
  const args = argv[0] === "--" ? argv.slice(1) : argv
  const discovery = args.includes(DISCOVERY_FLAG)
  const rest = args.filter((arg) => arg !== DISCOVERY_FLAG)
  const [did] = rest

  if (rest.length !== 1 || did === undefined || did.startsWith("-")) {
    return null
  }

  return { did, discovery }
}
