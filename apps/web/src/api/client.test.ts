import { describe, expect, it } from "vitest";
import { ApiError, apiRequest } from "./client";

const respond = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  (async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } })) as typeof fetch;

describe("apiRequest", () => {
  it("prefixes the versioned API path and returns data", async () => {
    let url = "";
    const f = (async (u: string) => ((url = u), new Response('{"status":"ok"}', { status: 200 }))) as unknown as typeof fetch;
    const res = await apiRequest<{ status: string }>("/health/live", {}, f);
    expect(url).toBe("/api/v1/health/live");
    expect(res).toEqual({ status: 200, data: { status: "ok" } });
  });

  it("maps the error envelope to ApiError", async () => {
    const f = respond(403, { error: { code: "FORBIDDEN", message: "Your role cannot do this", requestId: "req-1" } });
    await expect(apiRequest("/farms/x", {}, f)).rejects.toMatchObject({ code: "FORBIDDEN", status: 403, requestId: "req-1" });
  });

  it("treats accepted statuses as data", async () => {
    const res = await apiRequest("/health", { acceptStatuses: [503] }, respond(503, { status: "degraded" }));
    expect(res.status).toBe(503);
  });

  it("reports unreachable APIs as NETWORK_ERROR", async () => {
    const f = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    const err = await apiRequest("/health", {}, f).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: "NETWORK_ERROR", status: 0 });
  });
});
