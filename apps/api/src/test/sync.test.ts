import { describe, expect, it } from "vitest";
import { newId } from "../lib/util.js";
import { bearer, makeApp, register } from "./harness.js";

const mutation = (command: string, payload: unknown, baseVersion?: number, mutationId = newId()) => ({
  mutationId,
  command,
  payload,
  ...(baseVersion !== undefined ? { baseVersion } : {}),
  clientCreatedAt: new Date().toISOString(),
});

describe("offline sync", () => {
  it("pull returns farm changes in sequence order with a resume point", async () => {
    const ctx = makeApp();
    const o = await register(ctx.api, "sync@example.com");
    const pull = await ctx.api().get(`/api/v1/sync/pull?farmId=${o.farmId}&since=0`).set(bearer(o.access));
    expect(pull.status).toBe(200);
    expect(pull.body.changes).toHaveLength(1);
    expect(pull.body.changes[0]).toMatchObject({ seq: 1, entity: "farm", entityId: o.farmId, op: "upsert", version: 0 });
    expect(pull.body).toMatchObject({ nextSince: 1, hasMore: false });

    await ctx.api().patch(`/api/v1/farms/${o.farmId}`).set(bearer(o.access)).send({ name: "Renamed", version: 0 });
    const next = await ctx.api().get(`/api/v1/sync/pull?farmId=${o.farmId}&since=1`).set(bearer(o.access));
    expect(next.body.changes.map((c: { seq: number }) => c.seq)).toEqual([2]);
    expect(next.body.changes[0].document.name).toBe("Renamed");
  });

  it("push runs mutations through the same service as REST, exactly once", async () => {
    const ctx = makeApp();
    const o = await register(ctx.api, "push@example.com");
    const m = mutation("farm.update", { name: "Offline rename" }, 0);
    const body = { farmId: o.farmId, deviceId: "phone-1", mutations: [m] };

    const first = await ctx.api().post("/api/v1/sync/push").set(bearer(o.access)).send(body);
    expect(first.body.results[0]).toMatchObject({ status: "accepted", entityId: o.farmId, version: 1 });

    const resend = await ctx.api().post("/api/v1/sync/push").set(bearer(o.access)).send(body);
    expect(resend.body.results[0]).toEqual(first.body.results[0]);
    expect(ctx.store.farms.get(o.farmId)!.version).toBe(1);

    const evt = ctx.store.audit.all().find((a) => a.action === "farm.updated")!;
    expect(evt).toMatchObject({ mutationId: m.mutationId, deviceId: "phone-1" });
  });

  it("reports conflicts instead of overwriting, and rejects bad or unknown commands per mutation", async () => {
    const ctx = makeApp();
    const o = await register(ctx.api, "conflict@example.com");
    await ctx.api().patch(`/api/v1/farms/${o.farmId}`).set(bearer(o.access)).send({ name: "Web edit", version: 0 });

    const res = await ctx
      .api()
      .post("/api/v1/sync/push")
      .set(bearer(o.access))
      .send({
        farmId: o.farmId,
        deviceId: "phone-1",
        mutations: [
          mutation("farm.update", { name: "Phone edit" }, 0),
          mutation("flock.teleport", {}),
          mutation("farm.update", { timezone: "Not/AZone" }, 1),
        ],
      });
    const [conflict, unknown, invalid] = res.body.results;
    expect(conflict).toMatchObject({ status: "conflict", serverVersion: 1 });
    expect(conflict.serverDocument.name).toBe("Web edit");
    expect(unknown).toMatchObject({ status: "rejected", code: "UNKNOWN_COMMAND" });
    expect(invalid).toMatchObject({ status: "rejected", code: "VALIDATION_FAILED" });
    expect(ctx.store.farms.get(o.farmId)!.name).toBe("Web edit");
  });

  it("applies the same permissions offline as online", async () => {
    const ctx = makeApp();
    const owner = await register(ctx.api, "own@example.com");
    await ctx.api().post(`/api/v1/farms/${owner.farmId}/members`).set(bearer(owner.access)).send({ email: "w@example.com", role: "worker" });
    const w = await register(ctx.api, "w@example.com");
    await ctx.api().post("/api/v1/farms/invitations/accept").set(bearer(w.access)).send({ token: ctx.email.outbox.at(-1)!.token });

    const res = await ctx
      .api()
      .post("/api/v1/sync/push")
      .set(bearer(w.access))
      .send({ farmId: owner.farmId, deviceId: "w-phone", mutations: [mutation("farm.update", { name: "Hijack" }, 0)] });
    expect(res.body.results[0]).toMatchObject({ status: "rejected", code: "FORBIDDEN" });
  });
});
