import { describe, expect, it } from "vitest";
import { addDays, localDateOf } from "../domain/index.js";
import { bearer, joinAs, makeApp, register } from "./harness.js";

const TODAY = localDateOf(new Date(), "Asia/Kolkata");
const D = (n: number) => addDays(TODAY, n);

async function farmWithTeam() {
  const ctx = makeApp();
  const owner = await register(ctx, "owner@example.com");
  const worker = await joinAs(ctx, owner, "worker@example.com", "worker");
  const other = await joinAs(ctx, owner, "other@example.com", "worker");
  const accountant = await joinAs(ctx, owner, "acc@example.com", "accountant");
  const as = (who: { access: string }) => (m: "get" | "post" | "put" | "patch", p: string) => ctx.api()[m](`/api/v1/farms/${owner.farmId}${p}`).set(bearer(who.access));
  return { ctx, owner, worker, other, accountant, o: as(owner), w: as(worker), x: as(other), a: as(accountant) };
}

describe("tasks", () => {
  it("are created by managers, listed overdue first, and worked through start → complete → reopen", async () => {
    const { o, worker } = await farmWithTeam();
    const later = (await o("post", "/tasks").send({ title: "Order litter", dueDate: D(3) })).body;
    const late = (await o("post", "/tasks").send({ title: "Fix drinker line", dueDate: D(-1), priority: "high", assigneeUserId: worker.userId })).body;
    const nodate = (await o("post", "/tasks").send({ title: "Paint the store" })).body;
    expect(late).toMatchObject({ status: "open", overdue: true, assigneeName: expect.any(String), priority: "high" });
    const list = (await o("get", "/tasks")).body;
    expect(list.items.map((t: { title: string }) => t.title)).toEqual(["Fix drinker line", "Order litter", "Paint the store"]);
    expect(list.counts).toMatchObject({ total: 3, overdue: 1 });
    expect((await o("get", "/tasks?due=overdue")).body.items).toHaveLength(1);
    expect((await o("get", "/tasks?due=none")).body.items[0].id).toBe(nodate.id);
    expect((await o("post", `/tasks/${later.id}/start`)).body.status).toBe("in_progress");
    const done = (await o("post", `/tasks/${later.id}/complete`).send({ notes: "Ordered 40 bags" })).body;
    expect(done).toMatchObject({ status: "done", resolutionNotes: "Ordered 40 bags", completedByName: expect.any(String) });
    expect((await o("post", `/tasks/${later.id}/complete`).send({})).status).toBe(422);
    expect((await o("post", `/tasks/${later.id}/reopen`)).body.status).toBe("open");
    expect((await o("post", `/tasks/${nodate.id}/cancel`).send({ reason: "Not needed" })).body.status).toBe("cancelled");
    expect((await o("get", "/tasks?status=done")).body.items).toHaveLength(0);
  });

  it("workers complete their own or unassigned tasks, not someone else's, and cannot create them", async () => {
    const { o, w, x, a, worker, other } = await farmWithTeam();
    const mine = (await o("post", "/tasks").send({ title: "Mine", assigneeUserId: worker.userId })).body;
    const theirs = (await o("post", "/tasks").send({ title: "Theirs", assigneeUserId: other.userId })).body;
    const anyone = (await o("post", "/tasks").send({ title: "Anyone" })).body;
    expect((await w("post", "/tasks").send({ title: "Nope" })).status).toBe(403);
    expect((await w("post", `/tasks/${mine.id}/complete`).send({})).body.status).toBe("done");
    expect((await w("post", `/tasks/${anyone.id}/complete`).send({})).body.status).toBe("done");
    expect((await w("post", `/tasks/${theirs.id}/complete`).send({})).status).toBe(403);
    expect((await x("post", `/tasks/${theirs.id}/complete`).send({})).body.status).toBe("done");
    // "Mine" = assigned to me or to nobody.
    expect((await w("get", "/tasks?status=all&assignee=me")).body.items.map((t: { title: string }) => t.title).sort()).toEqual(["Anyone", "Mine"]);
    expect((await a("get", "/tasks")).status).toBe(200);
    expect((await a("post", `/tasks/${mine.id}/reopen`)).status).toBe(403);
  });

  it("rejects references to other farms, people not on the farm, and stale edits", async () => {
    const { ctx, o } = await farmWithTeam();
    const stranger = await register(ctx, "stranger@example.com");
    expect((await o("post", "/tasks").send({ title: "x", assigneeUserId: stranger.userId })).status).toBe(400);
    const t = (await o("post", "/tasks").send({ title: "Weigh birds" })).body;
    const edited = (await o("put", `/tasks/${t.id}`).send({ title: "Weigh 50 birds", priority: "high", version: t.version })).body;
    expect(edited).toMatchObject({ title: "Weigh 50 birds", priority: "high" });
    expect((await o("put", `/tasks/${t.id}`).send({ title: "again", priority: "low", version: t.version })).status).toBe(409);
  });

  it("corrective actions raised by biosecurity need notes to complete", async () => {
    const { o } = await farmWithTeam();
    await o("post", "/biosecurity/logs").send({ type: "pest_control", date: D(0), pest: { pestType: "rodents", activityFound: true } });
    const ca = (await o("get", "/tasks")).body.items.find((t: { kind: string }) => t.kind === "corrective_action");
    expect(ca).toBeTruthy();
    expect((await o("post", `/tasks/${ca.id}/complete`).send({})).status).toBe(400);
    expect((await o("post", `/tasks/${ca.id}/complete`).send({ notes: "Bait stations placed" })).body.status).toBe("done");
  });

  it("today lists the day's tasks, scheduled work and flocks still needing today's entry", async () => {
    const { o, w } = await farmWithTeam();
    const house = (await o("post", "/houses").send({ name: "H1", type: "layer" })).body;
    const flock = (await o("post", "/flocks").send({ name: "Layers", flockCode: "L1", type: "layer", houseId: house.id, placement: { date: D(-100), count: 500 } })).body;
    await o("post", "/health/vaccinations").send({ flockId: flock.id, vaccineName: "ND", dueDate: D(-1) });
    await o("post", "/tasks").send({ title: "Clean feeders", dueDate: D(0) });
    await o("post", "/tasks").send({ title: "Next week", dueDate: D(7) });
    const today = (await w("get", "/tasks/today")).body;
    expect(today.tasks.map((t: { title: string }) => t.title)).toEqual(["Clean feeders"]);
    expect(today.scheduled.some((e: { type: string; overdue: boolean }) => e.type === "vaccination_due" && e.overdue)).toBe(true);
    expect(today.dailyEntries).toEqual([{ flockId: flock.id, flockCode: "L1", houseName: "H1", recorded: false }]);
    expect(today.counts).toMatchObject({ tasks: 1, entriesMissing: 1 });
    await o("patch", `/flocks/${flock.id}/daily-records/${D(0)}`).send({ eggs: { collected: 400 } });
    expect((await w("get", "/tasks/today")).body.counts.entriesMissing).toBe(0);
  });
});

describe("home dashboard additions", () => {
  it("adds feed, water and weight per flock, the farm's average weight and the person's task summary", async () => {
    const { o, a } = await farmWithTeam();
    const house = (await o("post", "/houses").send({ name: "H1", type: "broiler" })).body;
    const big = (await o("post", "/flocks").send({ name: "B1", flockCode: "B1", type: "broiler", houseId: house.id, placement: { date: D(-20), count: 3000 } })).body;
    const small = (await o("post", "/flocks").send({ name: "B2", flockCode: "B2", type: "broiler", houseId: house.id, placement: { date: D(-10), count: 1000 } })).body;
    await o("post", `/flocks/${big.id}/weighings`).send({ date: D(-1), averageWeightG: 1000, sampleSize: 20 });
    await o("post", `/flocks/${small.id}/weighings`).send({ date: D(0), averageWeightG: 400, sampleSize: 20 });
    await o("patch", `/flocks/${big.id}/daily-records/${D(0)}`).send({ feed: [{ quantityKg: 250 }], waterLitres: 520, mortality: [{ cause: "unknown", count: 2 }] });
    await o("post", "/tasks").send({ title: "Late job", dueDate: D(-2) });
    await o("post", "/tasks").send({ title: "Today job", dueDate: D(0) });
    const d = (await o("get", "/dashboard")).body;
    expect(d.production.totals).toMatchObject({ feedKg: 250, waterLitres: 520, mortality: 2, latestWeighingDate: D(0) });
    expect(d.production.totals.averageWeightG).toBe(Math.round((1000 * 2998 + 400 * 1000) / 3998)); // weighted by birds alive
    expect(d.production.flocks.find((f: { flockCode: string }) => f.flockCode === "B1")).toMatchObject({ averageWeightG: 1000, latestWeighingDate: D(-1), feedKg: 250, waterLitres: 520, recorded: true });
    expect(d.tasks).toMatchObject({ open: 2, dueToday: 1, overdue: 1 });
    expect(d.tasks.next[0]).toMatchObject({ title: "Late job", overdue: true });
    expect((await a("get", "/dashboard")).body.tasks).toBeDefined(); // accountants can read tasks
  });
});
