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

  describe("after a redirect", () => {
    const body = { name: "alice" }

    it("returns invalid when an https request lands on an http URL", async () => {
      const fetch = mockResponse({
        ok: true,
        status: 200,
        url: "http://example.com/doc",
        json: () => Promise.resolve(body)
      })

      await expect(
        fetchWithSchema("https://example.com/doc", schema, fetch)
      ).resolves.toEqual({ status: "invalid" })
    })

    it("returns invalid, not missing, when the http URL returns 404", async () => {
      const fetch = mockResponse({
        ok: false,
        status: 404,
        url: "http://example.com/doc"
      })

      await expect(
        fetchWithSchema("https://example.com/doc", schema, fetch)
      ).resolves.toEqual({ status: "invalid" })
    })

    it("returns invalid when an https request lands on an allowed http host", async () => {
      const fetch = mockResponse({
        ok: true,
        status: 200,
        url: "http://localhost/doc",
        json: () => Promise.resolve(body)
      })

      await expect(
        fetchWithSchema("https://example.com/doc", schema, fetch, ["localhost"])
      ).resolves.toEqual({ status: "invalid" })
    })

    it("returns found when an https request lands on another https URL", async () => {
      const fetch = mockResponse({
        ok: true,
        status: 200,
        url: "https://cdn.example.com/doc",
        json: () => Promise.resolve(body)
      })

      await expect(
        fetchWithSchema("https://example.com/doc", schema, fetch)
      ).resolves.toEqual({ status: "found", value: body })
    })

    it("returns found when an http request lands on an allowed http host", async () => {
      const fetch = mockResponse({
        ok: true,
        status: 200,
        url: "http://localhost:3000/other",
        json: () => Promise.resolve(body)
      })

      await expect(
        fetchWithSchema("http://localhost:3000/doc", schema, fetch, [
          "localhost"
        ])
      ).resolves.toEqual({ status: "found", value: body })
    })

    it("returns invalid when an http request lands on another http host", async () => {
      const fetch = mockResponse({
        ok: true,
        status: 200,
        url: "http://evil.example/doc",
        json: () => Promise.resolve(body)
      })

      await expect(
        fetchWithSchema("http://localhost:3000/doc", schema, fetch, [
          "localhost"
        ])
      ).resolves.toEqual({ status: "invalid" })
    })
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
