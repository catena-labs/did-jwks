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

const REDIRECT_STATUSES: ReadonlySet<number> = new Set([
  301, 302, 303, 307, 308
])
const MAX_REDIRECTS = 5

/**
 * A redirect must not downgrade a fetch to `http`. Each hop must use `https`,
 * unless the request itself used `http` and the hop is on an allowed http
 * host (local testing).
 */
function isAllowedHop(
  requestedUrl: string,
  hopUrl: string,
  allowedHttpHosts: readonly string[]
): boolean {
  const hop = new URL(hopUrl)
  if (hop.protocol === "https:") {
    return true
  }

  return (
    hop.protocol === "http:" &&
    new URL(requestedUrl).protocol === "http:" &&
    allowedHttpHosts.includes(hop.hostname)
  )
}

interface RedirectState {
  readonly requestedUrl: string
  readonly fetchImpl: typeof fetch
  readonly allowedHttpHosts: readonly string[]
}

/**
 * Fetch a URL and follow redirects one hop at a time, so that every hop
 * passes `isAllowedHop`. With the default redirect mode, `fetch` shows only
 * the final URL, so an https to http to https chain would pass unseen.
 *
 * @returns The final response, or `null` if a hop fails the check, a redirect
 * has no valid `Location`, there are more than `MAX_REDIRECTS` redirects, or
 * the runtime hides the redirect (an opaque redirect in a browser).
 */
async function fetchWithCheckedRedirects(
  state: RedirectState,
  currentUrl: string,
  redirectsLeft: number
): Promise<Response | null> {
  const resp = await state.fetchImpl(currentUrl, { redirect: "manual" })
  if (resp.type === "opaqueredirect") {
    return null
  }

  if (!REDIRECT_STATUSES.has(resp.status)) {
    // A fetch implementation can ignore `redirect: "manual"` and follow
    // redirects itself. Then only the landed URL is visible, so check it.
    const landedUrl = resp.url || currentUrl
    return isAllowedHop(state.requestedUrl, landedUrl, state.allowedHttpHosts)
      ? resp
      : null
  }

  const location = resp.headers.get("location")
  if (
    redirectsLeft === 0 ||
    location === null ||
    !URL.canParse(location, currentUrl)
  ) {
    return null
  }

  const nextUrl = new URL(location, currentUrl).href
  return isAllowedHop(state.requestedUrl, nextUrl, state.allowedHttpHosts)
    ? await fetchWithCheckedRedirects(state, nextUrl, redirectsLeft - 1)
    : null
}

/**
 * Fetches a JSON document from a URL and validates it against a Valibot schema.
 *
 * Redirects are followed one hop at a time, up to `MAX_REDIRECTS`. Every hop
 * must use `https` (see `isAllowedHop`).
 *
 * @param url - The URL to fetch the document from.
 * @param schema - The Valibot schema to validate the document against.
 * @param fetchImpl - The fetch implementation to use.
 * @param allowedHttpHosts - The hosts that a redirect from an `http` request
 * may use over `http`.
 * @returns The fetch result. A redirect that fails a check is `invalid`, never
 * `missing`. A network error rejects.
 */
export async function fetchWithSchema<T extends v.GenericSchema>(
  url: string,
  schema: T,
  fetchImpl: typeof fetch = globalThis.fetch,
  allowedHttpHosts: readonly string[] = []
): Promise<FetchResult<v.InferOutput<T>>> {
  const resp = await fetchWithCheckedRedirects(
    { requestedUrl: url, fetchImpl, allowedHttpHosts },
    url,
    MAX_REDIRECTS
  )
  if (!resp) {
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
