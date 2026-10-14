import { describe, expect, it } from "vitest";
import { addDays, localDateOf } from "../domain/index.js";
import { bearer, makeApp, register } from "./harness.js";

const TODAY = localDateOf(new Date(), "Asia/Kolkata");
const D = (n: number) => addDays(TODAY, n);

describe("PATCH a day's record (one screen's section at a time)", () => {
  it("adds eggs without erasing the deaths, feed and water already recorded for the day", async () => {
    const ctx = makeApp();
    const o = await register(ctx, "o@example.com");
    const call = (m: "get" | "put" | "patch" | "post", p: string) => ctx.api()[m](`/api/v1/farms/${o.farmId}${p}`).set(bearer(o.access));
    const house = (await call("post", "/houses").send({ name: "LH", type: "layer" })).body;
    const flock = (await call("post", "/flocks").send({ name: "L1", flockCode: "L1", type: "layer", houseId: house.id, placement: { date: D(-200), count: 1000 } })).body;
    const first = (await call("put", `/flocks/${flock.id}/daily-records/${D(-1)}`).send({ mortality: [{ cause: "heat_stress", count: 4 }], feed: [{ quantityKg: 110, unitCostPerKg: { amountMinor: 3150, currency: "INR" } }], waterLitres: 240, temperatureMaxC: 34, notes: "Hot day" })).body;
    const patched = await call("patch", `/flocks/${flock.id}/daily-records/${D(-1)}`).send({ eggs: { collected: 860, broken: 12 }, version: first.version ?? 0 });
    expect(patched.status).toBe(200);
    expect(patched.body).toMatchObject({ mortalityTotal: 4, feedKg: 110, waterLitres: 240, temperatureMaxC: 34, notes: "Hot day", eggs: { collected: 860, broken: 12 } });
    expect(patched.body.feed[0].cost).toEqual({ amountMinor: 346_500, currency: "INR" }); // unchanged, not re-costed
    // The flock ledger still has exactly 4 deaths (not doubled).
    expect((await call("get", `/flocks/${flock.id}`)).body.currentBirdCount).toBe(996);
    // A stale version is refused rather than overwriting someone else's change.
    expect((await call("patch", `/flocks/${flock.id}/daily-records/${D(-1)}`).send({ eggs: { collected: 1 }, version: 0 })).status).toBe(409);
  });

  it("creates the day when none exists, and needs the version once it does", async () => {
    const ctx = makeApp();
    const o = await register(ctx, "o@example.com");
    const call = (m: "patch" | "post", p: string) => ctx.api()[m](`/api/v1/farms/${o.farmId}${p}`).set(bearer(o.access));
    const house = (await call("post", "/houses").send({ name: "LH", type: "layer" })).body;
    const flock = (await call("post", "/flocks").send({ name: "L1", flockCode: "L1", type: "layer", houseId: house.id, placement: { date: D(-100), count: 500 } })).body;
    const created = await call("patch", `/flocks/${flock.id}/daily-records/${D(0)}`).send({ eggs: { collected: 410 } });
    expect(created.body).toMatchObject({ eggs: { collected: 410, broken: 0 }, mortalityTotal: 0 });
    expect((await call("patch", `/flocks/${flock.id}/daily-records/${D(0)}`).send({ eggs: { collected: 420 } })).status).toBe(409);
  });
});

describe("PUT /me", () => {
  it("updates the signed-in person's own name and phone", async () => {
    const ctx = makeApp();
    const o = await register(ctx, "o@example.com");
    const r = await ctx.api().put("/api/v1/me").set(bearer(o.access)).send({ fullName: "Asha Verma", phone: "+91 98765 43210" });
    expect(r.body.user).toMatchObject({ fullName: "Asha Verma", phone: "+91 98765 43210", platformRoles: [] });
    expect((await ctx.api().put("/api/v1/me").set(bearer(o.access)).send({ fullName: "" })).status).toBe(400);
  });
});

describe("GET weigh-ins", () => {
  it("lists weigh-ins newest first, with spread when birds were weighed one by one", async () => {
    const ctx = makeApp();
    const o = await register(ctx, "o@example.com");
    const call = (m: "get" | "post", p: string) => ctx.api()[m](`/api/v1/farms/${o.farmId}${p}`).set(bearer(o.access));
    const house = (await call("post", "/houses").send({ name: "BH", type: "broiler" })).body;
    const flock = (await call("post", "/flocks").send({ name: "B1", flockCode: "B1", type: "broiler", houseId: house.id, placement: { date: D(-20), count: 1000 } })).body;
    await call("post", `/flocks/${flock.id}/weighings`).send({ date: D(-8), averageWeightG: 400, sampleSize: 30 });
    await call("post", `/flocks/${flock.id}/weighings`).send({ date: D(-1), weightsG: [900, 1000, 1100, 1000] });
    const list = (await call("get", `/flocks/${flock.id}/weighings`)).body.items;
    expect(list.map((w: { date: string }) => w.date)).toEqual([D(-1), D(-8)]);
    expect(list[0]).toMatchObject({ averageWeightG: 1000, sampleSize: 4, stats: { minG: 900, maxG: 1100, uniformityPercent: 100 } });
    expect(list[1].stats).toBeUndefined();
  });
});
