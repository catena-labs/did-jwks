import * as v from "valibot"
import { describe, expect, it, vi } from "vitest"

import { fetchWithSchema } from "./fetch-with-schema"

const schema = v.object({ name: v.string() })

function mockResponse(response: object) {
  return vi.fn(() =>
    Promise.resolve(response)
  ) as unknown as typeof globalThis.fetch
}

function redirect(location: string, status = 302) {
  return new Response(null, { status, headers: { location } })
}

function mockRoutes(routes: Record<string, () => Response>) {
  return vi.fn((url: string) =>
    Promise.resolve(routes[url]?.() ?? new Response(null, { status: 404 }))
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

  describe("redirect chains", () => {
    const body = { name: "alice" }
    const init = { redirect: "manual" }

    it.each([301, 302, 303, 307, 308])(
      "follows a %i redirect to another https URL one hop at a time",
      async (status) => {
        const fetch = mockRoutes({
          "https://example.com/doc": () =>
            redirect("https://cdn.example.com/doc", status),
          "https://cdn.example.com/doc": () => Response.json(body)
        })

        await expect(
          fetchWithSchema("https://example.com/doc", schema, fetch)
        ).resolves.toEqual({ status: "found", value: body })
        expect(fetch).toHaveBeenNthCalledWith(
          1,
          "https://example.com/doc",
          init
        )
        expect(fetch).toHaveBeenNthCalledWith(
          2,
          "https://cdn.example.com/doc",
          init
        )
      }
    )

    it("resolves a relative Location against the current URL", async () => {
      const fetch = mockRoutes({
        "https://example.com/doc": () => redirect("/other"),
        "https://example.com/other": () => Response.json(body)
      })

      await expect(
        fetchWithSchema("https://example.com/doc", schema, fetch)
      ).resolves.toEqual({ status: "found", value: body })
    })

    it("returns invalid for an https to http to https chain", async () => {
      const fetch = mockRoutes({
        "https://example.com/doc": () => redirect("http://example.com/hop"),
        "http://example.com/hop": () =>
          redirect("https://attacker.example/keys"),
        "https://attacker.example/keys": () => Response.json(body)
      })

      await expect(
        fetchWithSchema("https://example.com/doc", schema, fetch)
      ).resolves.toEqual({ status: "invalid" })
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it("returns invalid for a redirect to an allowed http host from an https request", async () => {
      const fetch = mockRoutes({
        "https://example.com/doc": () => redirect("http://localhost/doc"),
        "http://localhost/doc": () => Response.json(body)
      })

      await expect(
        fetchWithSchema("https://example.com/doc", schema, fetch, ["localhost"])
      ).resolves.toEqual({ status: "invalid" })
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it("follows an http redirect on an allowed http host for an http request", async () => {
      const fetch = mockRoutes({
        "http://localhost:3000/doc": () =>
          redirect("http://localhost:3000/other"),
        "http://localhost:3000/other": () => Response.json(body)
      })

      await expect(
        fetchWithSchema("http://localhost:3000/doc", schema, fetch, [
          "localhost"
        ])
      ).resolves.toEqual({ status: "found", value: body })
    })

    it("returns invalid for a redirect with no Location", async () => {
      const fetch = mockRoutes({
        "https://example.com/doc": () => new Response(null, { status: 302 })
      })

      await expect(
        fetchWithSchema("https://example.com/doc", schema, fetch)
      ).resolves.toEqual({ status: "invalid" })
    })

    it("returns invalid for an opaque redirect", async () => {
      const fetch = mockResponse({
        ok: false,
        status: 0,
        type: "opaqueredirect"
      })

      await expect(
        fetchWithSchema("https://example.com/doc", schema, fetch)
      ).resolves.toEqual({ status: "invalid" })
    })

    function redirectChain(length: number) {
      const hops = Array.from({ length }, (_, i) => [
        `https://example.com/r${i}`,
        () => redirect(`https://example.com/r${i + 1}`)
      ])
      return mockRoutes({
        ...Object.fromEntries(hops),
        [`https://example.com/r${length}`]: () => Response.json(body)
      })
    }

    it("follows 5 redirects", async () => {
      await expect(
        fetchWithSchema("https://example.com/r0", schema, redirectChain(5))
      ).resolves.toEqual({ status: "found", value: body })
    })

    it("returns invalid after more than 5 redirects", async () => {
      await expect(
        fetchWithSchema("https://example.com/r0", schema, redirectChain(6))
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
