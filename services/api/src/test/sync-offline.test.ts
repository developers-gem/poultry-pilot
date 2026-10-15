import { describe, expect, it } from "vitest";
import { addDays, localDateOf } from "../domain/index.js";
import { bearer, joinAs, makeApp, register } from "./harness.js";

const TODAY = localDateOf(new Date(), "Asia/Kolkata");
const D = (n: number) => addDays(TODAY, n);
const uuid = (n: number) => `01a20000-0000-7000-8000-${String(n).padStart(12, "0")}`;
const at = new Date().toISOString();

async function farm() {
  const ctx = makeApp();
  const o = await register(ctx, "owner@example.com");
  const call = (m: "get" | "post", p: string) => ctx.api()[m](`/api/v1/farms/${o.farmId}${p}`).set(bearer(o.access));
  const house = (await call("post", "/houses").send({ name: "H1", type: "layer" })).body;
  const flock = (await call("post", "/flocks").send({ name: "L1", flockCode: "L1", type: "layer", houseId: house.id, placement: { date: D(-100), count: 1000 } })).body;
  const push = (mutations: object[], who = o) => ctx.api().post("/api/v1/sync/push").set(bearer(who.access)).send({ farmId: o.farmId, deviceId: "phone-1", mutations });
  const birds = async () => (await call("get", `/flocks/${flock.id}`)).body.currentBirdCount as number;
  return { ctx, o, call, flock, push, birds };
}

const mortality = (n: number, flockId: string, count = 2) => ({ mutationId: uuid(n), command: "flock.mortality", payload: { flockId, date: D(0), count, cause: "unknown" }, clientCreatedAt: at });

describe("sync push survives interruptions", () => {
  it("a resent mutation returns its stored result and is applied once", async () => {
    const { push, flock, birds } = await farm();
    const first = await push([mortality(1, flock.id)]);
    expect(first.body.results[0]).toMatchObject({ status: "accepted" });
    const again = await push([mortality(1, flock.id)]); // response was lost; the phone resends
    expect(again.body.results[0]).toEqual(first.body.results[0]);
    expect(await birds()).toBe(998);
  });

  it("if the server dies between applying a mutation and recording it, nothing is kept and the retry applies it once", async () => {
    const { ctx, push, flock, birds } = await farm();
    const repo = ctx.container.repos.sync;
    const real = repo.saveProcessed.bind(repo);
    let failNext = true;
    repo.saveProcessed = async (rec, tx) => {
      if (failNext) {
        failNext = false;
        throw new Error("connection to the database lost");
      }
      return real(rec, tx);
    };
    expect((await push([mortality(2, flock.id)])).status).toBe(500);
    expect(await birds()).toBe(1000); // the deaths were rolled back with the missing record
    expect((await push([mortality(2, flock.id)])).body.results[0].status).toBe("accepted");
    expect(await birds()).toBe(998);
    expect((await push([mortality(2, flock.id)])).body.results[0].status).toBe("accepted");
    expect(await birds()).toBe(998); // still once
  });

  it("a batch cut off part-way: resending the whole batch applies each mutation exactly once", async () => {
    const { ctx, push, flock, birds } = await farm();
    const repo = ctx.container.repos.sync;
    const real = repo.saveProcessed.bind(repo);
    let saves = 0;
    repo.saveProcessed = async (rec, tx) => {
      saves++;
      if (saves === 2) throw new Error("server restarting");
      return real(rec, tx);
    };
    const batch = [mortality(10, flock.id, 1), mortality(11, flock.id, 2), mortality(12, flock.id, 3)];
    expect((await push(batch)).status).toBe(500); // the first was committed, the second rolled back
    expect(await birds()).toBe(999);
    const retry = await push(batch);
    expect(retry.body.results.map((r: { status: string }) => r.status)).toEqual(["accepted", "accepted", "accepted"]);
    expect(await birds()).toBe(994); // 1 + 2 + 3, each once
  });

  it("rejections are remembered too: resending gets the same answer, not a second attempt", async () => {
    const { ctx, o, push, flock } = await farm();
    const acc = await joinAs(ctx, o, "acc@example.com", "accountant");
    const r1 = await push([mortality(20, flock.id)], acc);
    expect(r1.body.results[0]).toMatchObject({ status: "rejected", code: "FORBIDDEN" });
    expect((await push([mortality(20, flock.id)], acc)).body.results[0]).toEqual(r1.body.results[0]);
  });
});

describe("offline commands", () => {
  it("daily_record.patch saves sections; a stale base version is a conflict carrying the server's day", async () => {
    const { push, flock } = await farm();
    const day = (n: number, patch: object, baseVersion?: number) => ({ mutationId: uuid(n), command: "daily_record.patch", payload: { flockId: flock.id, date: D(0), patch }, ...(baseVersion !== undefined ? { baseVersion } : {}), clientCreatedAt: at });
    const created = (await push([day(30, { eggs: { collected: 800, broken: 4 } })])).body.results[0];
    expect(created).toMatchObject({ status: "accepted", version: 0 });
    const next = (await push([day(31, { waterLitres: 210 }, 0)])).body.results[0];
    expect(next).toMatchObject({ status: "accepted", version: 1 });
    const stale = (await push([day(32, { waterLitres: 999 }, 0)])).body.results[0];
    expect(stale).toMatchObject({ status: "conflict", serverVersion: 1 });
    expect(stale.serverDocument).toMatchObject({ waterLitres: 210, eggs: { collected: 800 } });
    // A conflict is not stored: after resolving, the same mutation is resent with the server's version.
    expect((await push([day(32, { waterLitres: 999 }, 1)])).body.results[0]).toMatchObject({ status: "accepted", version: 2 });
    // No base version on an existing day is a conflict too (never a blind overwrite).
    expect((await push([day(33, { waterLitres: 1 })])).body.results[0].status).toBe("conflict");
  });

  it("completing a task twice (two phones, or a resend with a new id) is fine: it is done", async () => {
    const { call, push } = await farm();
    const t = (await call("post", "/tasks").send({ title: "Clean drinkers" })).body;
    const done = (n: number) => ({ mutationId: uuid(n), command: "task.complete", payload: { taskId: t.id, notes: "Done" }, clientCreatedAt: at });
    expect((await push([done(40)])).body.results[0].status).toBe("accepted");
    expect((await push([done(41)])).body.results[0].status).toBe("accepted");
    expect((await call("get", `/tasks/${t.id}`)).body.status).toBe("done");
  });

  it("health events carry the client's id, so the record exists once however often it is sent", async () => {
    const { call, push, flock } = await farm();
    const rec = (n: number) => ({ mutationId: uuid(n), command: "health.record", payload: { id: uuid(999), type: "observation", date: D(0), flockId: flock.id, title: "Coughing", symptoms: ["coughing"], affectedBirds: 3 }, clientCreatedAt: at });
    expect((await push([rec(50)])).body.results[0]).toMatchObject({ status: "accepted", entityId: uuid(999) });
    expect((await push([rec(51)])).body.results[0]).toMatchObject({ status: "accepted", entityId: uuid(999) });
    expect((await call("get", "/health/records")).body.items.filter((r: { id: string }) => r.id === uuid(999))).toHaveLength(1);
  });

  it("a vaccination recorded as given twice is given once", async () => {
    const { call, push, flock } = await farm();
    const v = (await call("post", "/health/vaccinations").send({ flockId: flock.id, vaccineName: "ND", dueDate: D(0) })).body;
    const give = (n: number) => ({ mutationId: uuid(n), command: "vaccination.administer", payload: { vaccinationId: v.id ?? v.items?.[0]?.id, date: D(0) }, clientCreatedAt: at });
    expect((await push([give(60)])).body.results[0].status).toBe("accepted");
    expect((await push([give(61)])).body.results[0].status).toBe("accepted");
    expect((await call("get", "/health/vaccinations")).body.items[0].status).toBe("done");
  });
});
