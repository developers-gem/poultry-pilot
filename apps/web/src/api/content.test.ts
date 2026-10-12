import { describe, expect, it } from "vitest";
import { fetchNews } from "./content";

describe("fetchNews", () => {
  it("asks the API for the reader's region and returns its items", async () => {
    let url = "";
    let auth: string | null = null;
    const item = { id: "1", slug: "s", title: "Feed prices ease", summary: "Maize fell.", source: "Agri News", sourceUrl: "https://example.org/n", publicationDate: "2026-10-05", region: "IN-UP", category: "markets", author: "Desk", origin: "external" };
    const f = (async (u: string, init?: RequestInit) => {
      url = u;
      auth = new Headers(init?.headers).get("authorization");
      return new Response(JSON.stringify({ items: [item] }), { status: 200 });
    }) as unknown as typeof fetch;
    expect(await fetchNews({ region: "IN-UP", limit: 10 }, f, "tok")).toEqual([item]);
    expect(url).toBe("/api/v1/content/news?region=IN-UP&limit=10");
    expect(auth).toBe("Bearer tok");
  });

  it("surfaces sign-in errors as their API code", async () => {
    const f = (async () => new Response(JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "Sign in" } }), { status: 401 })) as unknown as typeof fetch;
    await expect(fetchNews({}, f, null)).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
  });
});
