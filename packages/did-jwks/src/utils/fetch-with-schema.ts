import * as v from "valibot"

/**
 * Fetches a JSON document from a URL and validates it against a Valibot schema.
 *
 * @param url - The URL to fetch the document from.
 * @param schema - The Valibot schema to validate the document against.
 * @param fetchImpl - The fetch implementation to use.
 * @param isAllowedUrl - Optional transport guard. Applied to `url` before the
 *   request, and again to the URL the response actually came from, so a
 *   redirect cannot land somewhere the guard would have rejected.
 * @returns The validated document or `null` if the document could not be fetched or validated.
 */
export async function fetchWithSchema<T extends v.GenericSchema>(
  url: string,
  schema: T,
  fetchImpl: typeof fetch = globalThis.fetch,
  isAllowedUrl?: (url: string) => boolean
): Promise<v.InferOutput<T> | null> {
  if (isAllowedUrl && !isAllowedUrl(url)) {
    return null
  }

  const resp = await fetchImpl(url)
  if (!resp.ok) {
    return null
  }

  // `fetch` follows redirects by default, and nothing in the Fetch standard
  // stops one from crossing to another scheme or host. `resp.url` is where the
  // body actually came from, so the guard has to hold for it too.
  if (isAllowedUrl && resp.url && !isAllowedUrl(resp.url)) {
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
