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

export function mockFetchFn(json = {}) {
  return vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(json)
    })
  ) as unknown as typeof globalThis.fetch
}
