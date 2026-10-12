import { describe, expect, it } from "vitest";
import { bearer, makeApp, register } from "./harness.js";

async function setup() {
  const ctx = makeApp();
  const reader = await register(ctx, "reader@example.com");
  const editor = await register(ctx, "editor@example.com");
  const publisher = await register(ctx, "publisher@example.com");
  const publisher2 = await register(ctx, "publisher2@example.com");
  const grant = (userId: string, roles: ("content_editor" | "content_publisher")[]) => {
    const u = ctx.store.users.get(userId)!;
    ctx.store.users.put(userId, { ...u, platformRoles: roles });
  };
  grant(editor.userId, ["content_editor"]);
  grant(publisher.userId, ["content_publisher"]);
  grant(publisher2.userId, ["content_publisher"]);
  const as = (who: { access: string }) => ({
    get: (path: string) => ctx.api().get(`/api/v1${path}`).set(bearer(who.access)),
    post: (path: string, body: object = {}) => ctx.api().post(`/api/v1${path}`).set(bearer(who.access)).send(body),
    put: (path: string, body: object) => ctx.api().put(`/api/v1${path}`).set(bearer(who.access)).send(body),
  });
  return { ctx, reader: as(reader), editor: as(editor), publisher: as(publisher), publisher2: as(publisher2), ids: { editor: editor.userId, publisher: publisher.userId } };
}

const externalNews = (over: Record<string, unknown> = {}) => ({
  kind: "news",
  origin: "external",
  slug: "layer-feed-prices-ease",
  title: "Layer feed prices ease after harvest",
  summary: "Maize prices fell after a good harvest, lowering layer feed costs in the region.",
  content: "PoultryPilot summary: feed mills in Uttar Pradesh report lower maize prices this month.",
  category: "markets",
  author: "Market desk",
  source: "Example Agri News",
  sourceUrl: "https://example.org/news/feed-prices",
  publicationDate: "2026-10-05",
  regionCode: "IN-UP",
  ...over,
});

describe("externally sourced articles", () => {
  it("draft → review → published, and readers then see all ten fields", async () => {
    const s = await setup();
    expect((await s.reader.post("/admin/content/articles", externalNews())).status).toBe(403);
    expect((await s.editor.post("/admin/content/articles", externalNews({ sourceUrl: undefined }))).body.error.details).toEqual([{ path: "sourceUrl", message: "External articles need source and sourceUrl" }]);
    const draft = (await s.editor.post("/admin/content/articles", externalNews())).body;
    expect(draft).toMatchObject({ status: "draft", version: 0 });
    expect((await s.reader.get("/content/news?region=IN-UP")).body.items).toHaveLength(0);
    expect((await s.editor.post(`/admin/content/articles/${draft.id}/submit`)).body.status).toBe("in_review");
    expect((await s.editor.post(`/admin/content/articles/${draft.id}/publish`)).status).toBe(403);
    expect((await s.publisher.post(`/admin/content/articles/${draft.id}/publish`)).body).toMatchObject({ status: "published", reviewedBy: "Test Farmer" });
    const [item] = (await s.reader.get("/content/news?region=IN-UP")).body.items;
    expect(item).toMatchObject({ title: "Layer feed prices ease after harvest", summary: expect.any(String), source: "Example Agri News", sourceUrl: "https://example.org/news/feed-prices", publicationDate: "2026-10-05", region: "IN-UP", category: "markets", author: "Market desk", status: "published" });
    const full = (await s.reader.get("/content/articles/layer-feed-prices-ease")).body;
    expect(full.content).toMatch(/PoultryPilot summary/);
    expect(full.attribution).toBe("Summary by PoultryPilot. Read the original at Example Agri News.");
  });

  it("cannot be submitted without source, URL, date and summary", async () => {
    const s = await setup();
    const a = (await s.editor.post("/admin/content/articles", externalNews({ summary: undefined, publicationDate: undefined }))).body;
    const r = await s.editor.post(`/admin/content/articles/${a.id}/submit`);
    expect(r.body.error).toMatchObject({ code: "VALIDATION_FAILED", details: { missing: ["summary", "publicationDate"] } });
  });

  it("an external guide (not news) still needs its publication date", async () => {
    const s = await setup();
    const g = (await s.editor.post("/admin/content/articles", externalNews({ kind: "guide", slug: "ext-guide", category: "housing", publicationDate: undefined }))).body;
    expect((await s.editor.post(`/admin/content/articles/${g.id}/submit`)).body.error).toMatchObject({ code: "VALIDATION_FAILED", details: { missing: ["publicationDate"] } });
  });

  it("news is filtered by region and ordered by publication date", async () => {
    const s = await setup();
    async function publish(over: Record<string, unknown>) {
      const a = (await s.editor.post("/admin/content/articles", externalNews(over))).body;
      await s.editor.post(`/admin/content/articles/${a.id}/submit`);
      await s.publisher.post(`/admin/content/articles/${a.id}/publish`);
    }
    await publish({ slug: "up-older", sourceUrl: "https://e.org/1", publicationDate: "2026-09-20", regionCode: "IN-UP", title: "UP older" });
    await publish({ slug: "india-newer", sourceUrl: "https://e.org/2", publicationDate: "2026-10-08", regionCode: "IN", title: "India newer" });
    await publish({ slug: "global-mid", sourceUrl: "https://e.org/3", publicationDate: "2026-10-01", regionCode: "GLOBAL", title: "Global mid" });
    await publish({ slug: "kenya", sourceUrl: "https://e.org/4", publicationDate: "2026-10-09", regionCode: "KE", title: "Kenya" });
    expect((await s.reader.get("/content/news?region=IN-UP")).body.items.map((a: { title: string }) => a.title)).toEqual(["India newer", "Global mid", "UP older"]);
    expect((await s.reader.get("/content/news?region=KE")).body.items.map((a: { title: string }) => a.title)).toEqual(["Kenya", "Global mid"]);
    expect((await s.reader.get("/content/news")).body.items.map((a: { title: string }) => a.title)).toEqual(["Global mid"]);
    expect((await s.reader.get("/content/news?region=india")).status).toBe(400);
  });

  it("imports feed items for review: one per URL, HTML stripped, teaser only", async () => {
    const s = await setup();
    const items = [
      { title: "<b>Avian influenza</b> situation update", summary: `<p>${"Long teaser. ".repeat(80)}</p>`, sourceUrl: "https://example.org/ai-1", source: "WOAH", publicationDate: "2026-10-04", regionCode: "GLOBAL", category: "health" },
      { title: "Egg prices", sourceUrl: "https://example.org/eggs", source: "Agri News", regionCode: "IN", category: "markets" },
    ];
    expect((await s.reader.post("/admin/content/import", { items })).status).toBe(403);
    expect((await s.editor.post("/admin/content/import", { items })).body).toEqual({ created: 2, skipped: 0 });
    expect((await s.editor.post("/admin/content/import", { items })).body).toEqual({ created: 0, skipped: 2 });
    const queue = (await s.editor.get("/admin/content/articles?status=in_review")).body.items;
    const ai = queue.find((a: { sourceUrl: string }) => a.sourceUrl === "https://example.org/ai-1");
    expect(ai).toMatchObject({ title: "Avian influenza situation update", origin: "external", status: "in_review", content: null, slug: "avian-influenza-situation-update" });
    expect(ai.summary.length).toBeLessThanOrEqual(600);
    expect(ai.summary).not.toMatch(/</);
    expect((await s.reader.get("/content/news")).body.items).toHaveLength(0); // nothing reaches readers unreviewed
  });
});

describe("disease information and guides", () => {
  const disease = {
    kind: "disease", origin: "original", slug: "newcastle-disease", title: "Newcastle disease", category: "health",
    summary: "A highly contagious viral disease of birds. Know the signs and call your veterinarian.",
    content: "General information about Newcastle disease.",
    disease: { species: ["chicken", "turkey"], signs: ["Breathing difficulty", "Sudden deaths", "Drop in egg production"], transmission: "Contact with infected birds, people, equipment.", prevention: "Biosecurity and vaccination as advised by your veterinarian.", reportingNote: "Notifiable in many countries: report suspected cases to your veterinary authority." },
  };

  it("needs references, and a second person to publish", async () => {
    const s = await setup();
    const a = (await s.publisher.post("/admin/content/articles", disease)).body;
    expect((await s.publisher.post(`/admin/content/articles/${a.id}/submit`)).body.error.message).toMatch(/sources \(health, biosecurity and disease content must cite references\)/);
    const withRefs = (await s.publisher.put(`/admin/content/articles/${a.id}`, { ...disease, version: a.version, sources: [{ name: "WOAH: Newcastle disease", url: "https://www.woah.org/en/disease/newcastle-disease/" }] })).body;
    await s.publisher.post(`/admin/content/articles/${withRefs.id}/submit`);
    expect((await s.publisher.post(`/admin/content/articles/${a.id}/publish`)).body.error.message).toMatch(/someone other than the person who submitted it/);
    expect((await s.publisher2.post(`/admin/content/articles/${a.id}/publish`)).body.status).toBe("published");
    const read = (await s.reader.get("/content/articles/newcastle-disease")).body;
    expect(read).toMatchObject({ kind: "disease", disease: { signs: expect.arrayContaining(["Sudden deaths"]) }, disclaimer: expect.stringMatching(/not veterinary advice/), references: [expect.objectContaining({ name: "WOAH: Newcastle disease" })] });
    expect((await s.reader.get("/content/articles?kind=disease")).body.items).toHaveLength(1);
  });

  it("published articles are edited only by publishers; archiving removes them from readers; stale edits are refused", async () => {
    const s = await setup();
    const guide = { kind: "guide", slug: "litter-management", title: "Litter management", category: "housing", summary: "Keep litter dry and friable.", content: "Turn wet patches daily." };
    const a = (await s.editor.post("/admin/content/articles", guide)).body;
    await s.editor.post(`/admin/content/articles/${a.id}/submit`);
    const pub = (await s.publisher.post(`/admin/content/articles/${a.id}/publish`)).body;
    expect((await s.editor.put(`/admin/content/articles/${a.id}`, { ...guide, title: "Edited", version: pub.version })).status).toBe(403);
    expect((await s.publisher.put(`/admin/content/articles/${a.id}`, { ...guide, title: "Edited", version: 0 })).status).toBe(409);
    expect((await s.publisher.put(`/admin/content/articles/${a.id}`, { ...guide, summary: undefined, version: pub.version })).body.error.message).toMatch(/missing: summary/);
    await s.publisher.post(`/admin/content/articles/${a.id}/archive`);
    expect((await s.reader.get("/content/articles/litter-management")).status).toBe(404);
  });
});

describe("facts, glossary and courses", () => {
  it("fact of the day is the same for everyone on a day", async () => {
    const s = await setup();
    for (const n of [1, 2, 3]) {
      const a = (await s.editor.post("/admin/content/articles", { kind: "fact", slug: `fact-${n}`, title: `Fact ${n}`, category: "general", summary: `Fact number ${n}.` })).body;
      await s.editor.post(`/admin/content/articles/${a.id}/submit`);
      await s.publisher.post(`/admin/content/articles/${a.id}/publish`);
    }
    const one = (await s.reader.get("/content/facts/today")).body.fact;
    expect(one.slug).toMatch(/^fact-[123]$/);
    expect((await s.publisher.get("/content/facts/today")).body.fact.slug).toBe(one.slug);
  });

  it("glossary terms are searchable once a publisher publishes them", async () => {
    const s = await setup();
    const term = { slug: "fcr", term: "Feed conversion ratio (FCR)", definition: "Feed eaten divided by weight gained.", category: "performance" };
    expect((await s.editor.put("/admin/content/glossary", { ...term, status: "published" })).status).toBe(403);
    await s.editor.put("/admin/content/glossary", term);
    expect((await s.reader.get("/content/glossary?q=feed")).body.items).toHaveLength(0);
    await s.publisher.put("/admin/content/glossary", { ...term, status: "published" });
    expect((await s.reader.get("/content/glossary?q=feed")).body.items[0]).toMatchObject({ slug: "fcr", definition: "Feed eaten divided by weight gained." });
  });

  it("courses publish only with lesson content; readers track their own progress", async () => {
    const s = await setup();
    const course = { slug: "broiler-basics", title: "Broiler basics", category: "management", lessons: [{ lessonId: "brooding", title: "Brooding", content: "Warm, dry, draught-free.", minutes: 10, order: 1 }, { lessonId: "water", title: "Water", order: 2 }] };
    expect((await s.publisher.put("/admin/content/courses", { ...course, status: "published" })).body.error.message).toMatch(/every lesson needs content/);
    course.lessons[1] = { ...course.lessons[1]!, content: "Clean water always available." } as never;
    await s.publisher.put("/admin/content/courses", { ...course, status: "published" });
    expect((await s.reader.get("/content/courses")).body.items[0]).toMatchObject({ slug: "broiler-basics", lessons: 2, minutes: 10, completedLessons: 0 });
    const done = (await s.reader.post("/content/courses/broiler-basics/lessons/brooding/complete")).body;
    expect(done.progress).toEqual({ completed: 1, total: 2, percent: 50 });
    expect(done.lessons[0].completedAt).toBeTruthy();
    expect((await s.publisher.get("/content/courses/broiler-basics")).body.progress.completed).toBe(0); // progress is personal
    expect((await s.reader.post("/content/courses/broiler-basics/lessons/nope/complete")).status).toBe(404);
  });
});
