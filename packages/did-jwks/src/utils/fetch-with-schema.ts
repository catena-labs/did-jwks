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
