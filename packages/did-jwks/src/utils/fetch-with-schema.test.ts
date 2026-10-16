import * as v from "valibot"
import { describe, expect, it, vi } from "vitest"

import { fetchWithSchema } from "./fetch-with-schema"

const schema = v.object({ name: v.string() })

function mockResponse(response: object) {
  return vi.fn(() =>
    Promise.resolve(response)
  ) as unknown as typeof globalThis.fetch
}

describe("fetchWithSchema()", () => {
  it("returns found with the parsed value", async () => {
    const fetch = mockResponse({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ name: "alice" })
    })

    await expect(
      fetchWithSchema("https://example.com", schema, fetch)
    ).resolves.toEqual({ status: "found", value: { name: "alice" } })
  })

  it("returns missing for a 404", async () => {
    const fetch = mockResponse({ ok: false, status: 404 })

    await expect(
      fetchWithSchema("https://example.com", schema, fetch)
    ).resolves.toEqual({ status: "missing" })
  })

  it.each([400, 401, 403, 410, 500, 503])(
    "returns invalid for a %i",
    async (status) => {
      const fetch = mockResponse({ ok: false, status })

      await expect(
        fetchWithSchema("https://example.com", schema, fetch)
      ).resolves.toEqual({ status: "invalid" })
    }
  )

  it("returns invalid for a body that is not JSON", async () => {
    const fetch = mockResponse({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError("Unexpected token <"))
    })

    await expect(
      fetchWithSchema("https://example.com", schema, fetch)
    ).resolves.toEqual({ status: "invalid" })
  })

  it("returns invalid for a body that does not match the schema", async () => {
    const fetch = mockResponse({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ name: 42 })
    })

    await expect(
      fetchWithSchema("https://example.com", schema, fetch)
    ).resolves.toEqual({ status: "invalid" })
  })

  it("rejects on a network error", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValue(
        new TypeError("fetch failed")
      ) as unknown as typeof globalThis.fetch

    await expect(
      fetchWithSchema("https://example.com", schema, fetch)
    ).rejects.toThrow("fetch failed")
  })
})
