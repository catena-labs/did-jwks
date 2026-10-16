import { vi } from "vitest"

export function createMockOidcHost({
  jwks,
  oidc
}: {
  jwks: { keys: Record<string, unknown>[] }
  oidc: { jwks_uri: string }
}) {
  return vi.fn((url: string) => {
    if (url.endsWith("/.well-known/openid-configuration")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(oidc)
      })
    }

    if (url === oidc.jwks_uri) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(jwks)
      })
    }

    return Promise.resolve({
      ok: false,
      status: 404
    })
  }) as unknown as typeof globalThis.fetch
}

/**
 * Create a fetch mock that serves each JSON body at its exact URL and
 * returns 404 for every other URL.
 */
export function createMockFetch(routes: Record<string, object>) {
  return vi.fn((url: string) => {
    const body = routes[url]
    if (body === undefined) {
      return Promise.resolve({ ok: false, status: 404 })
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body)
    })
  }) as unknown as typeof globalThis.fetch
}

/**
 * Create a fetch mock that returns the same error status for every URL.
 */
export function mockFetchStatus(status: number) {
  return vi.fn(() =>
    Promise.resolve({ ok: false, status })
  ) as unknown as typeof globalThis.fetch
}

export function mockFetchFn(json = {}) {
  return vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(json)
    })
  ) as unknown as typeof globalThis.fetch
}
