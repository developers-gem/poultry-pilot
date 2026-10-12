import { AppError, notFound } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { Repositories } from "../ports/repositories.js";
import type { ArticleRecord, CourseRecord, GlossaryTermRecord, UserRecord } from "../ports/records.js";
import { assertCan, type FarmContext, type RequestContext } from "./context.js";

type PlatformRole = NonNullable<UserRecord["platformRoles"]>[number];
const DISCLAIMER = "This is general information, not veterinary advice. Talk to your veterinarian about your flock.";

/**
 * Educational content. Every health or biosecurity article names its sources, and no article gives treatment or
 * dosing instructions. Seed articles below are general and must be reviewed by a veterinarian before launch.
 */
export const SEED_ARTICLES: Omit<ArticleRecord, "id" | "createdAt" | "updatedAt" | "version">[] = [
  {
    kind: "guide",
    origin: "original",
    category: "biosecurity",
    author: "PoultryPilot editorial team",
    slug: "biosecurity-basics",
    locale: "en",
    title: "Biosecurity basics for poultry farms",
    summary: "The everyday habits that keep disease out of a flock: controlling who and what comes in, keeping houses clean, and keeping wild birds and rodents away.",
    content: [
      "Biosecurity means the practices that stop disease agents entering a farm, spreading within it, or leaving it.",
      "Control movement: keep a record of every visitor and vehicle, ask about recent contact with other poultry, and provide farm boots and clothing. Many farms set a minimum time since a visitor last had contact with poultry; agree yours with your veterinarian.",
      "Keep it clean: remove litter and organic matter before disinfecting, use disinfectants as the label directs, and keep footbaths clean and topped up.",
      "Keep wild birds and rodents out: close gaps, cover feed, clean up spills, and record what you see.",
      "Know your obligations: rules on reporting disease, disposing of dead birds and moving poultry differ between countries. Ask your veterinarian or local animal health authority which apply to you.",
      "This is general information, not veterinary advice.",
    ].join("\n\n"),
    regionCode: "GLOBAL",
    tags: ["biosecurity"],
    status: "published",
    publishedAt: new Date("2026-10-01T00:00:00Z"),
    sources: [
      { name: "FAO (2008). Biosecurity for Highly Pathogenic Avian Influenza: Issues and Options. FAO Animal Production and Health Paper 165", url: "https://www.fao.org/3/i0359e/i0359e00.htm" },
      { name: "World Organisation for Animal Health (WOAH): Avian influenza", url: "https://www.woah.org/en/disease/avian-influenza/" },
    ],
  },
  {
    kind: "guide",
    origin: "original",
    category: "health",
    author: "PoultryPilot editorial team",
    slug: "withdrawal-periods",
    locale: "en",
    title: "What a withdrawal period is, and why records matter",
    summary: "Why meat and eggs from treated birds must not be sold until the withdrawal period has passed, and how PoultryPilot helps you keep track.",
    content: [
      "After birds receive some medicines, residues can remain in meat or eggs for a time. The withdrawal period is the time after the last dose during which meat or eggs must not enter the food supply.",
      "The period depends on the product and how it is used. It is printed on the label or set by your veterinarian, and limits are set nationally. PoultryPilot does not supply withdrawal periods: you record the one that applies, and the app calculates the end date, reminds you, and blocks bird sales until it has passed.",
      "Keep a record of every treatment: product, batch, dose, how it was given, start date, duration and who prescribed it. Use medicines only as directed by your veterinarian.",
      "This is general information, not veterinary advice.",
    ].join("\n\n"),
    regionCode: "GLOBAL",
    tags: ["health", "medicines"],
    status: "published",
    publishedAt: new Date("2026-10-01T00:00:00Z"),
    sources: [
      { name: "Codex Alimentarius: Maximum residue limits for residues of veterinary drugs in foods (database)", url: "https://www.fao.org/fao-who-codexalimentarius/codex-texts/dbs/vetdrugs/en/" },
      { name: "World Organisation for Animal Health (WOAH): Antimicrobial resistance", url: "https://www.woah.org/en/what-we-do/global-initiatives/antimicrobial-resistance/" },
    ],
  },
  {
    kind: "guide",
    origin: "original",
    category: "health",
    author: "PoultryPilot editorial team",
    slug: "when-to-call-your-veterinarian",
    locale: "en",
    title: "Changes worth calling your veterinarian about",
    summary: "Records that often show trouble early, and why a sudden change should prompt a call rather than a guess.",
    content: [
      "Many poultry diseases look alike, and some must be reported to the authorities. Only a veterinarian, often with laboratory tests, can say what is wrong. PoultryPilot records what you observe; it does not diagnose.",
      "Changes that are worth a call: a sudden rise in deaths; birds eating or drinking noticeably less; a sharp drop in egg production or egg quality; breathing difficulty, swelling or unusual droppings in several birds.",
      "Your daily records help your veterinarian: deaths per day, feed and water use, eggs, and photos of what you saw.",
      "If you suspect a notifiable disease, follow your country's reporting rules; your veterinarian or local animal health office can tell you what they are.",
      "This is general information, not veterinary advice.",
    ].join("\n\n"),
    regionCode: "GLOBAL",
    tags: ["health"],
    status: "published",
    publishedAt: new Date("2026-10-01T00:00:00Z"),
    sources: [
      { name: "World Organisation for Animal Health (WOAH): Newcastle disease", url: "https://www.woah.org/en/disease/newcastle-disease/" },
      { name: "World Organisation for Animal Health (WOAH): Avian influenza", url: "https://www.woah.org/en/disease/avian-influenza/" },
    ],
  },
];

export interface ArticleInput {
  kind: ArticleRecord["kind"];
  origin: ArticleRecord["origin"];
  slug: string;
  locale: string;
  title: string;
  summary?: string;
  content?: string;
  category: ArticleRecord["category"];
  author?: string;
  source?: string;
  sourceUrl?: string;
  publicationDate?: string;
  regionCode: string;
  tags?: string[];
  disease?: ArticleRecord["disease"];
  sources?: ArticleRecord["sources"];
}

export interface ImportItem {
  title: string;
  summary?: string;
  sourceUrl: string;
  publicationDate?: string;
  author?: string;
  source: string;
  regionCode: string;
  category: ArticleRecord["category"];
}

/** Region codes a reader sees: global, their country, and their region if given ("IN-UP" → GLOBAL, IN, IN-UP). */
export function regionsFor(region?: string): string[] {
  if (!region) return ["GLOBAL"];
  return [...new Set(["GLOBAL", region.slice(0, 2), region])];
}

const stripHtml = (s: string) =>
  s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "item";

/** The publishing rules, enforced in the service for every storage adapter (MongoDB also checks them in the schema). */
export function assertPublishable(a: Pick<ArticleRecord, "kind" | "origin" | "summary" | "source" | "sourceUrl" | "publicationDate" | "category" | "tags" | "sources">) {
  const missing: string[] = [];
  if (!a.summary) missing.push("summary");
  if (a.origin === "external") {
    if (!a.source) missing.push("source");
    if (!a.sourceUrl) missing.push("sourceUrl");
    if (!a.publicationDate) missing.push("publicationDate");
  }
  if (a.kind === "news" && !a.publicationDate && !missing.includes("publicationDate")) missing.push("publicationDate");
  const health = a.kind === "disease" || a.category === "health" || a.category === "biosecurity" || !!a.tags?.some((t) => t === "health" || t === "biosecurity");
  if (health && a.origin !== "external" && !a.sources.length) missing.push("sources (health, biosecurity and disease content must cite references)");
  if (missing.length) throw new AppError("VALIDATION_FAILED", `Cannot publish yet; missing: ${missing.join(", ")}`, { missing });
}

export function createContentService(d: { repos: Repositories; clock: Clock }) {
  const { repos, clock } = d;

  async function requireRole(ctx: RequestContext, role: PlatformRole) {
    const roles = (await repos.users.findById(ctx.userId))?.platformRoles ?? [];
    // Publishers can also do everything an editor can.
    if (!roles.includes(role) && !(role === "content_editor" && roles.includes("content_publisher"))) throw new AppError("FORBIDDEN", `This needs the ${role.replace("_", " ")} role`);
  }

  const articleView = (a: ArticleRecord, full: boolean) => ({
    id: a.id,
    slug: a.slug,
    kind: a.kind,
    origin: a.origin,
    locale: a.locale,
    title: a.title,
    summary: a.summary ?? null,
    ...(full ? { content: a.content ?? null } : {}),
    category: a.category,
    author: a.author ?? null,
    source: a.source ?? null,
    sourceUrl: a.sourceUrl ?? null,
    publicationDate: a.publicationDate ?? a.publishedAt?.toISOString().slice(0, 10) ?? null,
    region: a.regionCode,
    tags: a.tags ?? [],
    status: a.status,
    ...(full && a.disease ? { disease: a.disease } : {}),
    ...(full ? { references: a.sources } : {}),
    ...(full && (a.kind === "disease" || a.category === "health") ? { disclaimer: DISCLAIMER } : {}),
    ...(full && a.origin === "external" ? { attribution: `Summary by PoultryPilot. Read the original at ${a.source}.` } : {}),
    reviewedBy: a.reviewedBy ?? null,
  });

  const editorView = (a: ArticleRecord) => ({ ...articleView(a, true), version: a.version, submittedBy: a.submittedBy ?? null, updatedAt: a.updatedAt.toISOString() });

  async function published(q: { kind?: ArticleRecord["kind"]; category?: string; region?: string; q?: string; locale: string; limit: number }) {
    return repos.articles.find({
      status: "published",
      ...(q.kind ? { kind: q.kind } : {}),
      ...(q.category ? { category: q.category } : {}),
      ...(q.q ? { text: q.q } : {}),
      locale: q.locale,
      regionCodes: regionsFor(q.region),
      sortBy: q.kind === "news" ? "publicationDate" : "publishedAt",
      limit: q.limit,
    });
  }

  async function loadArticle(id: string) {
    const a = await repos.articles.findById(id);
    if (!a) throw notFound("Article");
    return a;
  }

  async function writeArticle(ctx: RequestContext, a: ArticleRecord, patch: Partial<ArticleRecord>, expectedVersion: number) {
    const next = await repos.articles.update(a.id, { ...patch, updatedBy: ctx.userId, updatedAt: clock.now() }, expectedVersion);
    if (!next) throw new AppError("VERSION_CONFLICT", "This article was changed by someone else. Reload and try again.", { serverVersion: a.version });
    return next;
  }

  const duplicate = (what: string) => (e: unknown) => {
    if ((e as { code?: number }).code === 11000) throw new AppError("DUPLICATE", `${what} already exists`);
    throw e;
  };

  async function courseView(ctx: RequestContext, slug: string, locale: string) {
    const c = await repos.courses.findBySlug(slug, locale);
    if (!c || c.status !== "published") throw notFound("Course");
    const done = new Map((await repos.trainingProgress.forUser(ctx.userId, c.id)).map((p) => [p.lessonId, p.completedAt]));
    const lessons = [...c.lessons].sort((a, b) => a.order - b.order);
    return {
      slug: c.slug, title: c.title, summary: c.summary ?? null, level: c.level, category: c.category, author: c.author ?? null, references: c.sources,
      lessons: lessons.map((l) => ({ lessonId: l.lessonId, title: l.title, content: l.content ?? null, minutes: l.minutes ?? null, completedAt: done.get(l.lessonId)?.toISOString() ?? null })),
      progress: { completed: done.size, total: lessons.length, percent: lessons.length ? Math.round((done.size / lessons.length) * 100) : 0 },
    };
  }

  return {
    // ---- readers (any signed-in user)

    async listArticles(_ctx: RequestContext, q: { kind?: ArticleRecord["kind"]; category?: string; region?: string; q?: string; locale: string; limit: number }) {
      return (await published(q)).map((a) => articleView(a, false));
    },

    /** News for the reader's region, newest publication first. Comes from the database; nothing is built into the apps. */
    async news(_ctx: RequestContext, q: { category?: string; region?: string; locale: string; limit: number }) {
      return (await published({ ...q, kind: "news" })).map((a) => articleView(a, false));
    },

    async getArticle(_ctx: RequestContext, slug: string, locale: string) {
      const a = await repos.articles.findBySlug(slug, locale);
      if (!a || a.status !== "published") throw notFound("Article");
      return articleView(a, true);
    },

    /** One fact a day for the reader's region: the same for everyone on a given date. */
    async factOfTheDay(_ctx: RequestContext, q: { region?: string; locale: string }) {
      const facts = await published({ kind: "fact", ...(q.region ? { region: q.region } : {}), locale: q.locale, limit: 500 });
      if (!facts.length) return null;
      const day = Math.floor(clock.now().getTime() / 86_400_000);
      const sorted = [...facts].sort((a, b) => (a.slug < b.slug ? -1 : 1));
      return articleView(sorted[day % sorted.length]!, true);
    },

    async glossary(_ctx: RequestContext, q: { q?: string; category?: string; region?: string; locale: string; limit: number }) {
      const rows = await repos.glossary.find({ status: "published", ...(q.q ? { text: q.q } : {}), ...(q.category ? { category: q.category } : {}), locale: q.locale, regionCodes: regionsFor(q.region), sortBy: "term", limit: q.limit });
      return rows.map((t) => ({ slug: t.slug, term: t.term, definition: t.definition ?? null, category: t.category, relatedSlugs: t.relatedSlugs ?? [], references: t.sources }));
    },

    async courses(ctx: RequestContext, q: { region?: string; category?: string; locale: string }) {
      const rows = await repos.courses.find({ status: "published", ...(q.category ? { category: q.category } : {}), locale: q.locale, regionCodes: regionsFor(q.region), sortBy: "order", limit: 200 });
      const done = await repos.trainingProgress.forUser(ctx.userId);
      return rows.map((c) => ({ slug: c.slug, title: c.title, summary: c.summary ?? null, level: c.level, category: c.category, lessons: c.lessons.length, minutes: c.lessons.reduce((t, l) => t + (l.minutes ?? 0), 0), completedLessons: done.filter((p) => p.courseId === c.id).length }));
    },

    course: courseView,

    async completeLesson(ctx: RequestContext, slug: string, lessonId: string, locale: string) {
      const c = await repos.courses.findBySlug(slug, locale);
      if (!c || c.status !== "published") throw notFound("Course");
      if (!c.lessons.some((l) => l.lessonId === lessonId)) throw notFound("Lesson");
      await repos.trainingProgress.complete(ctx.userId, c.id, lessonId, clock.now());
      return courseView(ctx, slug, locale);
    },

    /** Farm-scoped alias: published articles for the farm's country and global ones. */
    async list(ctx: FarmContext, q: { kind?: ArticleRecord["kind"]; tag?: string; region?: string; locale: string }) {
      assertCan(ctx, "content.read");
      const farm = await repos.farms.findById(ctx.farmId);
      const region = q.region ?? farm?.countryCode;
      const rows = await published({ ...(q.kind ? { kind: q.kind } : {}), ...(region ? { region } : {}), locale: q.locale, limit: 200 });
      return rows.filter((a) => !q.tag || a.tags?.includes(q.tag)).map((a) => articleView(a, false));
    },

    async get(ctx: FarmContext, slug: string, locale: string) {
      assertCan(ctx, "content.read");
      const a = await repos.articles.findBySlug(slug, locale);
      if (!a || a.status !== "published") throw notFound("Article");
      return articleView(a, true);
    },

    // ---- editors and publishers (platform roles)

    async editorList(ctx: RequestContext, q: { status?: ArticleRecord["status"]; kind?: ArticleRecord["kind"]; q?: string; limit: number }) {
      await requireRole(ctx, "content_editor");
      return (await repos.articles.find({ ...(q.status ? { status: q.status } : {}), ...(q.kind ? { kind: q.kind } : {}), ...(q.q ? { text: q.q } : {}), sortBy: "updatedAt", limit: q.limit })).map(editorView);
    },

    async editorGet(ctx: RequestContext, id: string) {
      await requireRole(ctx, "content_editor");
      return editorView(await loadArticle(id));
    },

    async createArticle(ctx: RequestContext, i: ArticleInput) {
      await requireRole(ctx, "content_editor");
      const now = clock.now();
      const rec: ArticleRecord = { id: newId(), ...i, sources: i.sources ?? [], status: "draft", createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.articles.insert(rec).catch(duplicate("An article with that slug or source URL"));
      return editorView(rec);
    },

    /** Drafts and articles in review can be edited by editors; published ones only by publishers (and stay checked). */
    async updateArticle(ctx: RequestContext, id: string, i: ArticleInput & { version: number }) {
      await requireRole(ctx, "content_editor");
      const a = await loadArticle(id);
      if (a.status === "archived") throw new AppError("INVALID_STATE_TRANSITION", "Archived articles cannot be edited");
      if (a.status === "published") {
        await requireRole(ctx, "content_publisher");
        assertPublishable({ ...i, sources: i.sources ?? [] });
      }
      const { version, ...fields } = i;
      // A full replace: optional fields the editor left out are cleared.
      const blank = { summary: undefined, content: undefined, author: undefined, source: undefined, sourceUrl: undefined, publicationDate: undefined, tags: undefined, disease: undefined };
      return editorView(await writeArticle(ctx, a, { ...blank, ...fields, sources: i.sources ?? [] }, version).catch(duplicate("An article with that slug or source URL")));
    },

    async submit(ctx: RequestContext, id: string) {
      await requireRole(ctx, "content_editor");
      const a = await loadArticle(id);
      if (a.status !== "draft") throw new AppError("INVALID_STATE_TRANSITION", `A ${a.status} article cannot be submitted`);
      assertPublishable(a);
      return editorView(await writeArticle(ctx, a, { status: "in_review", submittedBy: ctx.userId }, a.version));
    },

    /** Publishing is a publisher's review. Health, biosecurity and disease content needs a second person. */
    async publish(ctx: RequestContext, id: string) {
      await requireRole(ctx, "content_publisher");
      const a = await loadArticle(id);
      if (a.status !== "in_review") throw new AppError("INVALID_STATE_TRANSITION", a.status === "draft" ? "Submit the article for review first" : `A ${a.status} article cannot be published`);
      assertPublishable(a);
      const health = a.kind === "disease" || a.category === "health" || a.category === "biosecurity";
      if (health && a.submittedBy === ctx.userId) throw new AppError("FORBIDDEN", "Health, biosecurity and disease content must be published by someone other than the person who submitted it");
      const reviewer = (await repos.users.findById(ctx.userId))?.fullName ?? ctx.userId;
      return editorView(await writeArticle(ctx, a, { status: "published", publishedAt: a.publishedAt ?? clock.now(), reviewedBy: reviewer, reviewedAt: clock.now() }, a.version));
    },

    async reject(ctx: RequestContext, id: string, reason: string) {
      await requireRole(ctx, "content_publisher");
      const a = await loadArticle(id);
      if (a.status !== "in_review") throw new AppError("INVALID_STATE_TRANSITION", `A ${a.status} article cannot be sent back`);
      const tags = [...new Set([...(a.tags ?? []), "needs-changes"])];
      return { ...editorView(await writeArticle(ctx, a, { status: "draft", tags }, a.version)), reason };
    },

    async archive(ctx: RequestContext, id: string) {
      await requireRole(ctx, "content_publisher");
      const a = await loadArticle(id);
      if (a.status === "archived") throw new AppError("INVALID_STATE_TRANSITION", "Already archived");
      return editorView(await writeArticle(ctx, a, { status: "archived" }, a.version));
    },

    /**
     * Imports externally sourced items (from a news feed or a partner) for review: one article per source URL, title and
     * the publisher's own teaser only (HTML stripped, 600 characters at most), never the full text. Always in review.
     */
    async importExternal(ctx: RequestContext | null, items: ImportItem[], kind: ArticleRecord["kind"] = "news") {
      if (ctx) await requireRole(ctx, "content_editor");
      let created = 0;
      let skipped = 0;
      const now = clock.now();
      for (const it of items) {
        if (!/^https?:\/\//.test(it.sourceUrl) || !it.title.trim() || (await repos.articles.findBySourceUrl(it.sourceUrl))) {
          skipped++;
          continue;
        }
        const summary = it.summary ? stripHtml(it.summary).slice(0, 600) : undefined;
        const base = slugify(stripHtml(it.title));
        let slug = base;
        for (let n = 2; await repos.articles.findBySlug(slug, "en"); n++) slug = `${base}-${n}`;
        await repos.articles.insert({
          id: newId(), kind, origin: "external", slug, locale: "en", title: stripHtml(it.title).slice(0, 200),
          ...(summary ? { summary } : {}), category: it.category, ...(it.author ? { author: it.author.slice(0, 120) } : {}), source: it.source.slice(0, 160), sourceUrl: it.sourceUrl,
          ...(it.publicationDate ? { publicationDate: it.publicationDate } : {}), regionCode: it.regionCode, sources: [], status: "in_review",
          createdBy: ctx?.userId ?? "system", createdAt: now, updatedAt: now, version: 0,
        });
        created++;
      }
      return { created, skipped };
    },

    // ---- glossary and courses (editorial)

    async upsertGlossary(ctx: RequestContext, i: Omit<GlossaryTermRecord, "id" | "createdAt" | "updatedAt" | "version" | "status" | "createdBy" | "updatedBy"> & { status: "draft" | "published"; version?: number }) {
      await requireRole(ctx, i.status === "published" ? "content_publisher" : "content_editor");
      const now = clock.now();
      const cur = await repos.glossary.findBySlug(i.slug, i.locale);
      const { version, ...fields } = i;
      if (!cur) {
        const rec: GlossaryTermRecord = { id: newId(), ...fields, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
        await repos.glossary.insert(rec);
        return rec;
      }
      const next = await repos.glossary.update(cur.id, { ...fields, updatedBy: ctx.userId, updatedAt: now }, version ?? cur.version);
      if (!next) throw new AppError("VERSION_CONFLICT", "This term was changed by someone else");
      return next;
    },

    async upsertCourse(ctx: RequestContext, i: Omit<CourseRecord, "id" | "createdAt" | "updatedAt" | "version" | "status" | "createdBy" | "updatedBy" | "publishedAt" | "reviewedBy" | "reviewedAt"> & { status: "draft" | "published"; version?: number }) {
      await requireRole(ctx, i.status === "published" ? "content_publisher" : "content_editor");
      const ids = i.lessons.map((l) => l.lessonId);
      if (new Set(ids).size !== ids.length) throw new AppError("VALIDATION_FAILED", "Lesson ids must be unique within a course");
      if (i.status === "published" && (!i.lessons.length || i.lessons.some((l) => !l.content))) throw new AppError("VALIDATION_FAILED", "A published course needs at least one lesson, and every lesson needs content");
      if (i.status === "published" && (i.category === "health" || i.category === "biosecurity") && !i.sources.length) throw new AppError("VALIDATION_FAILED", "Health and biosecurity courses must cite references");
      const now = clock.now();
      const cur = await repos.courses.findBySlug(i.slug, i.locale);
      const { version, ...fields } = i;
      const review = i.status === "published" ? { publishedAt: cur?.publishedAt ?? now, reviewedBy: (await repos.users.findById(ctx.userId))?.fullName ?? ctx.userId, reviewedAt: now } : {};
      if (!cur) {
        const rec: CourseRecord = { id: newId(), ...fields, ...review, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
        await repos.courses.insert(rec);
        return rec;
      }
      const next = await repos.courses.update(cur.id, { ...fields, ...review, updatedBy: ctx.userId, updatedAt: now }, version ?? cur.version);
      if (!next) throw new AppError("VERSION_CONFLICT", "This course was changed by someone else");
      return next;
    },

    /** Loads the seed articles (idempotent: existing slugs are left alone). Health and biosecurity seeds need sources. */
    async seed() {
      const now = clock.now();
      let created = 0;
      for (const a of SEED_ARTICLES) {
        assertPublishable(a);
        if (await repos.articles.findBySlug(a.slug, a.locale)) continue;
        await repos.articles.insert({ ...a, id: newId(), createdAt: now, updatedAt: now, version: 0 });
        created++;
      }
      return { articles: SEED_ARTICLES.length, created };
    },
  };
}

export type ContentService = ReturnType<typeof createContentService>;
