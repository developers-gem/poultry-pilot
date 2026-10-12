import * as C from "@poultrypilot/constants";
import { z } from "zod";
import { Id, LocalDate, NonEmptyText, OptionalText } from "../primitives.js";

/** Knowledge platform: reading and editorial contracts. */

const Region = z.string().regex(/^(GLOBAL|[A-Z]{2}(-[A-Z0-9]{1,3})?)$/, "GLOBAL, a country code (IN) or a region (IN-UP)");
const Locale = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/).default("en");
const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase words separated by hyphens").max(120);
const Url = z.string().url().max(2000).refine((u) => /^https?:\/\//.test(u), "http or https only");
const Reference = z.object({ name: NonEmptyText(300), url: Url.optional() }).strict();
const Category = z.enum(C.CONTENT_CATEGORIES);
const Kind = z.enum(C.ARTICLE_KINDS);
const Limit = (d: number) => z.coerce.number().int().min(1).max(200).default(d);

export const ContentArticleQuery = z.object({ kind: Kind.optional(), category: Category.optional(), region: Region.optional(), q: z.string().trim().max(80).optional(), locale: Locale, limit: Limit(50) });
export const NewsQuery = z.object({ category: Category.optional(), region: Region.optional(), locale: Locale, limit: Limit(20) });
export const FactQuery = z.object({ region: Region.optional(), locale: Locale });
export const GlossaryQuery = z.object({ q: z.string().trim().max(80).optional(), category: z.string().max(60).optional(), region: Region.optional(), locale: Locale, limit: Limit(100) });
export const CourseQuery = z.object({ category: Category.optional(), region: Region.optional(), locale: Locale });
export const LocaleQuery = z.object({ locale: Locale });
/** Farm-scoped list (region defaults to the farm's country). */
export const ArticleListQuery = z.object({ kind: Kind.optional(), tag: z.string().max(40).optional(), region: Region.optional(), locale: Locale });

export const ArticleRequest = z
  .object({
    kind: Kind,
    origin: z.enum(C.ARTICLE_ORIGINS).default("original"),
    slug: Slug,
    locale: Locale,
    title: NonEmptyText(200),
    summary: OptionalText(600),
    content: z.string().max(50_000).optional(),
    category: Category,
    author: OptionalText(120),
    source: OptionalText(160),
    sourceUrl: Url.optional(),
    publicationDate: LocalDate.optional(),
    regionCode: Region.default("GLOBAL"),
    tags: z.array(z.string().trim().toLowerCase().max(40)).max(20).optional(),
    disease: z
      .object({ species: z.array(z.string().max(40)).max(10).optional(), signs: z.array(z.string().max(200)).max(30).optional(), transmission: OptionalText(2000), prevention: OptionalText(2000), reportingNote: OptionalText(500) })
      .strict()
      .optional(),
    sources: z.array(Reference).max(20).optional(),
  })
  .strict()
  .refine((a) => a.origin !== "external" || (!!a.source && !!a.sourceUrl), { message: "External articles need source and sourceUrl", path: ["sourceUrl"] })
  .refine((a) => !a.disease || a.kind === "disease", { message: "Disease details belong on disease articles", path: ["disease"] });
export const UpdateArticleRequest = ArticleRequest.innerType().innerType().extend({ version: z.number().int().nonnegative() }).strict();
export const EditorArticleQuery = z.object({ status: z.enum(C.CONTENT_STATUSES).optional(), kind: Kind.optional(), q: z.string().trim().max(80).optional(), limit: Limit(50) });
export const RejectRequest = z.object({ reason: z.string().trim().min(3).max(500) }).strict();

export const ImportRequest = z
  .object({
    kind: Kind.default("news"),
    items: z
      .array(z.object({ title: NonEmptyText(300), summary: z.string().max(5000).optional(), sourceUrl: Url, publicationDate: LocalDate.optional(), author: OptionalText(120), source: NonEmptyText(160), regionCode: Region.default("GLOBAL"), category: Category.default("general") }).strict())
      .min(1)
      .max(200),
  })
  .strict();

export const GlossaryRequest = z
  .object({ slug: Slug, locale: Locale, term: NonEmptyText(120), definition: z.string().trim().min(1).max(2000), category: NonEmptyText(60), relatedSlugs: z.array(Slug).max(20).optional(), regionCode: Region.default("GLOBAL"), status: z.enum(["draft", "published"]).default("draft"), sources: z.array(Reference).max(10).default([]), version: z.number().int().nonnegative().optional() })
  .strict();

export const CourseRequest = z
  .object({
    slug: Slug,
    locale: Locale,
    title: NonEmptyText(150),
    summary: OptionalText(500),
    level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
    order: z.number().int().min(0).max(10_000).default(0),
    category: Category.default("management"),
    regionCode: Region.default("GLOBAL"),
    author: OptionalText(120),
    lessons: z.array(z.object({ lessonId: Slug, title: NonEmptyText(150), content: z.string().max(20_000).optional(), minutes: z.number().int().min(1).max(120).optional(), order: z.number().int().min(0).max(1000).default(0) }).strict()).max(50),
    status: z.enum(["draft", "published"]).default("draft"),
    sources: z.array(Reference).max(20).default([]),
    version: z.number().int().nonnegative().optional(),
  })
  .strict();

export const LessonParams = z.object({ slug: Slug, lessonId: Slug });
export const SlugParams = z.object({ slug: Slug });
export const IdParams = z.object({ id: Id });

// ---- reports ------------------------------------------------------------------------

export const ReportType = z.enum(C.REPORT_TYPES);
export const ReportQuery = z
  .object({ format: z.enum(C.REPORT_FORMATS).default("pdf"), from: LocalDate.optional(), to: LocalDate.optional(), flockId: Id.optional() })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: "from must be on or before to", path: ["from"] });
