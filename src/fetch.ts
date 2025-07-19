import * as v from "valibot"
import { OpenIDConfigurationSchema } from "./schemas"
import type { Did, JsonWebKeySet } from "web-identity-schemas"
import { JsonWebKeySetSchema } from "web-identity-schemas/valibot"

const jwksUrl = (base: string) => `${base}/.well-known/jwks.json`
const openidConfigurationUrl = (base: string) =>
  `${base}/.well-known/openid-configuration`

export interface FetchJwksOptions {
  /**
   * The fetch function to use.
   *
   * @default globalThis.fetch
   */
  fetch?: typeof globalThis.fetch
  /**
   * The hosts that are allowed to be used via `http`. All other hosts will
   * require `https`.  This is useful for local development and testing.
   *
   * @default []
   */
  allowedHttpHosts?: string[]
}

export async function fetchJwks(
  did: Did<"jwks">,
  opts: FetchJwksOptions = {}
): Promise<JsonWebKeySet | null> {
  const base = buildBaseUrl(did, opts.allowedHttpHosts)

  let jwks = await fetchWithSchema(
    jwksUrl(base),
    JsonWebKeySetSchema,
    opts.fetch
  )

  if (jwks) {
    return jwks
  }

  // If that fails, try OpenID configuration
  const openidConfig = await fetchWithSchema(
    openidConfigurationUrl(base),
    OpenIDConfigurationSchema,
    opts.fetch
  )
  if (!openidConfig?.jwks_uri) {
    return null
  }

  jwks = await fetchWithSchema(
    openidConfig.jwks_uri,
    JsonWebKeySetSchema,
    opts.fetch
  )

  return jwks
}

async function fetchWithSchema<T extends v.GenericSchema>(
  url: string,
  schema: T,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<v.InferOutput<T> | null> {
  const resp = await fetchImpl(url)
  if (!resp.ok) {
    return null
  }

  const result = v.safeParse(schema, await resp.json())

  if (result.success) {
    return result.output
  }

  return null
}

export function isHttpAllowed(
  path: string,
  allowedHttpHosts: string[] = []
): boolean {
  const [host] = path.split("/")

  if (host) {
    const [hostWithoutPort] = host.split(":")
    return allowedHttpHosts.some((host) => host === hostWithoutPort)
  }

  return false
}

/**
 * Build a base path from a full `did:jwks` URI.
 *
 * @example
 * ```
 * const base = buildBasePath("did:jwks:accounts.google.com:matt");
 * // base === "accounts.google.com/matt"
 * ```
 *
 * @returns The base path
 */
export function buildBaseUrl(
  did: Did<"jwks">,
  allowedHttpHosts: string[] = []
): string {
  const basePath = did
    .replace(/^did:jwks:/, "")
    .split(":")
    .map(decodeURIComponent)
    .join("/")

  return isHttpAllowed(basePath, allowedHttpHosts)
    ? `http://${basePath}`
    : `https://${basePath}`
}
