import * as v from "valibot"

/**
 * The result of a fetch that is validated against a schema.
 *
 * - `found`: the response is a success and the body matches the schema.
 * - `missing`: the response status is 404.
 * - `invalid`: any other status, a body that is not JSON, or a body that does
 *   not match the schema.
 */
export type FetchResult<T> =
  | { readonly status: "found"; readonly value: T }
  | { readonly status: "missing" }
  | { readonly status: "invalid" }

const MISSING: FetchResult<never> = { status: "missing" }
const INVALID: FetchResult<never> = { status: "invalid" }

/**
 * A redirect must not downgrade a fetch to `http`. The landed URL must use
 * `https`, unless the request itself used `http` and the landed host is an
 * allowed http host (local testing).
 */
function isAllowedLandedUrl(
  requestedUrl: string,
  landedUrl: string,
  allowedHttpHosts: readonly string[]
): boolean {
  const landed = new URL(landedUrl)
  if (landed.protocol === "https:") {
    return true
  }

  return (
    landed.protocol === "http:" &&
    new URL(requestedUrl).protocol === "http:" &&
    allowedHttpHosts.includes(landed.hostname)
  )
}

/**
 * Fetches a JSON document from a URL and validates it against a Valibot schema.
 *
 * @param url - The URL to fetch the document from.
 * @param schema - The Valibot schema to validate the document against.
 * @param fetchImpl - The fetch implementation to use.
 * @param allowedHttpHosts - The hosts that a redirect from an `http` request
 * may land on over `http`.
 * @returns The fetch result. A redirect that downgrades to `http` is
 * `invalid`. A network error rejects.
 */
export async function fetchWithSchema<T extends v.GenericSchema>(
  url: string,
  schema: T,
  fetchImpl: typeof fetch = globalThis.fetch,
  allowedHttpHosts: readonly string[] = []
): Promise<FetchResult<v.InferOutput<T>>> {
  const resp = await fetchImpl(url)
  // A synthetic Response has an empty url; treat it as the requested URL.
  if (!isAllowedLandedUrl(url, resp.url || url, allowedHttpHosts)) {
    return INVALID
  }
  if (resp.status === 404) {
    return MISSING
  }
  if (!resp.ok) {
    return INVALID
  }

  let json: unknown
  try {
    json = await resp.json()
  } catch (error) {
    if (error instanceof SyntaxError) {
      return INVALID
    }
    throw error
  }

  const result = v.safeParse(schema, json)
  return result.success ? { status: "found", value: result.output } : INVALID
}
