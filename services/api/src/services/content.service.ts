import { AppError, notFound } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { Repositories } from "../ports/repositories.js";
import type { ArticleRecord } from "../ports/records.js";
import { assertCan, type FarmContext } from "./context.js";

/**
 * Educational content. Every health or biosecurity article names its sources, and no article gives treatment or
 * dosing instructions. Seed articles below are general and must be reviewed by a veterinarian before launch.
 */
export const SEED_ARTICLES: Omit<ArticleRecord, "id" | "createdAt" | "updatedAt" | "version">[] = [
  {
    kind: "guide",
    slug: "biosecurity-basics",
    locale: "en",
    title: "Biosecurity basics for poultry farms",
    summary: "The everyday habits that keep disease out of a flock: controlling who and what comes in, keeping houses clean, and keeping wild birds and rodents away.",
    body: [
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
    slug: "withdrawal-periods",
    locale: "en",
    title: "What a withdrawal period is, and why records matter",
    summary: "Why meat and eggs from treated birds must not be sold until the withdrawal period has passed, and how PoultryPilot helps you keep track.",
    body: [
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
    slug: "when-to-call-your-veterinarian",
    locale: "en",
    title: "Changes worth calling your veterinarian about",
    summary: "Records that often show trouble early, and why a sudden change should prompt a call rather than a guess.",
    body: [
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

export function createContentService(d: { repos: Repositories; clock: Clock }) {
  const view = (a: ArticleRecord, withBody: boolean) => ({
    slug: a.slug,
    kind: a.kind,
    locale: a.locale,
    title: a.title,
    summary: a.summary,
    ...(withBody ? { body: a.body } : {}),
    regionCode: a.regionCode,
    tags: a.tags ?? [],
    publishedAt: a.publishedAt?.toISOString() ?? null,
    reviewedBy: a.reviewedBy ?? null,
    sources: a.sources,
  });

  return {
    /** Published articles for the farm's country and global ones. */
    async list(ctx: FarmContext, q: { kind?: ArticleRecord["kind"]; tag?: string; region?: string; locale: string }) {
      assertCan(ctx, "content.read");
      const farm = await d.repos.farms.findById(ctx.farmId);
      const region = q.region ?? farm?.countryCode;
      const rows = await d.repos.articles.findPublished({ ...(q.kind ? { kind: q.kind } : {}), ...(q.tag ? { tag: q.tag } : {}), regionCodes: ["GLOBAL", ...(region ? [region] : [])], locale: q.locale });
      return rows.map((a) => view(a, false));
    },

    async get(ctx: FarmContext, slug: string, locale: string) {
      assertCan(ctx, "content.read");
      const a = await d.repos.articles.findBySlug(slug, locale);
      if (!a || a.status !== "published") throw notFound("Article");
      return view(a, true);
    },

    /** Loads the seed articles (idempotent). Health and biosecurity articles without sources are refused. */
    async seed() {
      const now = d.clock.now();
      for (const a of SEED_ARTICLES) {
        if ((a.tags?.includes("health") || a.tags?.includes("biosecurity")) && !a.sources.length) throw new AppError("VALIDATION_FAILED", `${a.slug} needs sources`);
        await d.repos.articles.upsert({ ...a, id: newId(), createdAt: now, updatedAt: now, version: 0 });
      }
      return { articles: SEED_ARTICLES.length };
    },
  };
}

export type ContentService = ReturnType<typeof createContentService>;
