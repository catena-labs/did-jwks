import * as v from "valibot"

/**
 * Returns true when `url` may be fetched given the HTTP host allowlist.
 * HTTPS is always allowed. HTTP is allowed only for hosts listed in
 * `allowedHttpHosts` (same policy as DID base URL construction).
 */
export function isAllowedFetchUrl(
  url: string,
  allowedHttpHosts: string[] = []
): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  if (parsed.protocol === "https:") {
    return true
  }

  if (parsed.protocol === "http:") {
    return allowedHttpHosts.includes(parsed.hostname)
  }

  return false
}

/**
 * Fetches a JSON document from a URL and validates it against a Valibot schema.
 *
 * After the fetch completes, the final response URL (`Response.url`, which
 * reflects redirects) is checked against the same HTTPS / `allowedHttpHosts`
 * policy as DID resolution. An HTTPS request that redirects to a non-allowed
 * `http:` URL is rejected.
 *
 * @param url - The URL to fetch the document from.
 * @param schema - The Valibot schema to validate the document against.
 * @param fetchImpl - The fetch implementation to use.
 * @param allowedHttpHosts - Hosts permitted to use `http:` (including after redirects).
 * @returns The validated document or `null` if the document could not be fetched or validated.
 */
export async function fetchWithSchema<T extends v.GenericSchema>(
  url: string,
  schema: T,
  fetchImpl: typeof fetch = globalThis.fetch,
  allowedHttpHosts: string[] = []
): Promise<v.InferOutput<T> | null> {
  if (!isAllowedFetchUrl(url, allowedHttpHosts)) {
    return null
  }

  const resp = await fetchImpl(url)
  if (!resp.ok) {
    return null
  }

  // Native fetch sets `Response.url` to the final URL after redirects.
  // Mocks often omit it; fall back to the request URL in that case.
  const finalUrl = resp.url || url
  if (!isAllowedFetchUrl(finalUrl, allowedHttpHosts)) {
    return null
  }

  let json: unknown
  try {
    json = await resp.json()
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null
    }
    throw error
  }

  const result = v.safeParse(schema, json)

  if (result.success) {
    return result.output
  }

  return null
}
