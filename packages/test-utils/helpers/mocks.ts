import { vi } from "vitest"

/**
 * A mock route: a JSON body served with status 200, or a status code served
 * with no body.
 */
type MockRoute = object | number

function mockResponse(route: MockRoute) {
  if (typeof route === "number") {
    return { ok: route >= 200 && route < 300, status: route }
  }

  return { ok: true, status: 200, json: () => Promise.resolve(route) }
}

/**
 * Create a fetch mock that serves each route at its exact URL and returns 404
 * for every other URL.
 */
export function createMockFetch(routes: Record<string, MockRoute>) {
  return vi.fn((url: string) =>
    Promise.resolve(mockResponse(routes[url] ?? 404))
  ) as unknown as typeof globalThis.fetch
}
