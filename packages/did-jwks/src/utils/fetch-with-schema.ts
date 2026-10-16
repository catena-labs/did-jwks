import * as v from "valibot"

/**
 * Fetches a JSON document from a URL and validates it against a Valibot schema.
 *
 * @param url - The URL to fetch the document from.
 * @param schema - The Valibot schema to validate the document against.
 * @param fetchImpl - The fetch implementation to use.
 * @returns The validated document or `null` if the document could not be fetched or validated.
 */
export async function fetchWithSchema<T extends v.GenericSchema>(
  url: string,
  schema: T,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<v.InferOutput<T> | null> {
  let resp: Response
  try {
    resp = await fetchImpl(url)
  } catch {
    // A network-level failure (DNS resolution, connection refused, TLS
    // handshake failure, timeout, etc.) is exactly as much "could not be
    // fetched" as a non-ok HTTP status is — both leave this URL without a
    // usable document. Treating it the same way (return null, rather than
    // letting the rejection propagate) is what lets callers like
    // `fetchJwks` fall through from a JWKS URL that isn't reachable to the
    // OAuth2/OIDC discovery URL, as the spec's resolution algorithm
    // requires ("If JWKS is not found, attempt OAuth2/OIDC Discovery" does
    // not distinguish *why* it wasn't found). Unlike the JSON-parse
    // failure below, every rejection here is a fetch-level failure by
    // construction — there's no narrower error type to rethrow instead.
    return null
  }
  if (!resp.ok) {
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
