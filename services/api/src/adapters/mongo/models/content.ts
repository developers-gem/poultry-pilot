import { ARTICLE_KINDS, ARTICLE_ORIGINS, CONTENT_CATEGORIES, CONTENT_STATUSES } from "@poultrypilot/constants";
import { Schema } from "mongoose";
import { SourceSchema, defineCollection, enumOf, instant, int, localDate, ref, str, text } from "./base.js";

const D = "Content";
const regionCode = { type: String, required: true, match: /^(GLOBAL|[A-Z]{2}(-[A-Z0-9]{1,3})?)$/, default: "GLOBAL" };
const sources = { type: [SourceSchema], default: [] };

export const TrainingCourseModel = defineCollection({
  model: "TrainingCourse",
  collection: "training_courses",
  domain: D,
  ownership: "global",
  versioned: true,
  description: "A course and its lessons (embedded: always read together, a few lessons each). Health lessons need expert review before publishing.",
  fields: {
    slug: str({ required: true, max: 80, lowercase: true }),
    locale: str({ required: true, max: 10 }),
    title: str({ required: true, max: 150 }),
    summary: text(500),
    level: enumOf(["beginner", "intermediate", "advanced"], { required: true, default: "beginner" }),
    order: int({ default: 0 }),
    lessons: {
      type: [
        new Schema(
          { lessonId: str({ required: true, max: 80 }), title: str({ required: true, max: 150 }), content: text(20_000), minutes: int({ max: 120 }), order: int({ default: 0 }) },
          { _id: false },
        ),
      ],
      default: [],
    },
    category: enumOf(CONTENT_CATEGORIES, { required: true, default: "management" }),
    regionCode,
    author: str({ max: 120 }),
    status: enumOf(CONTENT_STATUSES, { required: true, default: "draft" }),
    publishedAt: instant(),
    reviewedBy: str({ max: 120 }),
    reviewedAt: instant(),
    sources,
  },
  indexes: [
    { fields: { slug: 1, locale: 1 }, options: { unique: true }, why: "Open a course by slug in the reader's language" },
    { fields: { status: 1, locale: 1, order: 1 }, why: "Published course catalog in display order" },
  ],
});

export const TrainingProgressModel = defineCollection({
  model: "TrainingProgress",
  collection: "training_progress",
  domain: D,
  ownership: "user",
  description: "A lesson a person has completed. Personal, not farm-owned: progress follows the person across farms.",
  fields: {
    userId: ref("User", { required: true }),
    courseId: ref("TrainingCourse", { required: true }),
    lessonId: str({ required: true, max: 80 }),
    completedAt: instant({ required: true }),
  },
  indexes: [{ fields: { userId: 1, lessonId: 1 }, options: { unique: true }, why: "A person's progress (prefix); a lesson is completed once" }],
  relations: [{ field: "lessonId", to: "TrainingCourse.lessons.lessonId", cardinality: "many-to-one", note: "Embedded lesson id" }],
});

export const ArticleModel = defineCollection({
  model: "Article",
  collection: "articles",
  domain: D,
  ownership: "global",
  versioned: true,
  description:
    "Facts, poultry management guides, news and disease information. External articles carry title, summary, content, source, source URL, publication date, region, category, author and status; they cannot be published without source, URL and date. Health, biosecurity and disease articles must cite references.",
  fields: {
    kind: enumOf(ARTICLE_KINDS, { required: true }),
    origin: enumOf(ARTICLE_ORIGINS, { required: true, default: "original" }),
    slug: str({ required: true, max: 120, lowercase: true }),
    locale: str({ required: true, max: 10 }),
    title: str({ required: true, max: 200 }),
    summary: text(600),
    /** The article text. For external items, PoultryPilot's own summary or commentary, never a copy of the source. */
    content: text(50_000),
    category: enumOf(CONTENT_CATEGORIES, { required: true, default: "general" }),
    author: str({ max: 120 }),
    /** External articles: the publisher and the original URL and date. */
    source: str({ max: 160 }),
    sourceUrl: { type: String, maxlength: 2000, match: /^https?:\/\/\S+$/ },
    publicationDate: localDate(),
    regionCode,
    tags: { type: [str({ max: 40, lowercase: true })], default: undefined },
    /** Disease information: structured so the apps can show it consistently. Never dosing or treatment instructions. */
    disease: {
      type: new Schema(
        {
          species: { type: [str({ max: 40 })], default: undefined },
          signs: { type: [str({ max: 200 })], default: undefined },
          transmission: text(2000),
          prevention: text(2000),
          /** e.g. "Notifiable in many countries: report suspected cases to your veterinary authority." */
          reportingNote: text(500),
        },
        { _id: false },
      ),
    },
    status: enumOf(CONTENT_STATUSES, { required: true, default: "draft" }),
    publishedAt: instant(),
    submittedBy: ref("User"),
    reviewedBy: str({ max: 120 }),
    reviewedAt: instant(),
    expiresAt: instant(),
    /** References (additional sources). */
    sources,
  },
  indexes: [
    { fields: { slug: 1, locale: 1 }, options: { unique: true }, why: "Open an article by slug" },
    { fields: { status: 1, kind: 1, locale: 1, regionCode: 1, publicationDate: -1 }, why: "Feed for a kind in my language and region (regionCode $in [mine, GLOBAL]), newest first" },
    { fields: { sourceUrl: 1 }, options: { unique: true, partialFilterExpression: { sourceUrl: { $type: "string" } } }, why: "Import de-duplication: one article per external URL" },
  ],
  configure: (schema) =>
    schema.pre("validate", function () {
      if (this.get("status") !== "published") return;
      const kind = this.get("kind") as string;
      const refs = (this.get("sources") as unknown[])?.length ?? 0;
      if (!this.get("summary")) this.invalidate("summary", "Published articles need a summary");
      if (this.get("origin") === "external") {
        if (!this.get("source")) this.invalidate("source", "External articles need the source's name");
        if (!this.get("sourceUrl")) this.invalidate("sourceUrl", "External articles need the source URL");
        if (!this.get("publicationDate")) this.invalidate("publicationDate", "External articles need the publication date");
      }
      if (kind === "news" && !this.get("publicationDate")) this.invalidate("publicationDate", "News needs a publication date");
      // Educational health, biosecurity and disease content must cite where it comes from.
      const tags = (this.get("tags") as string[] | undefined) ?? [];
      const healthy = kind === "disease" || ["health", "biosecurity"].includes(this.get("category") as string) || tags.includes("health") || tags.includes("biosecurity");
      if (healthy && !refs && this.get("origin") !== "external") this.invalidate("sources", "Published health and biosecurity articles need at least one source");
    }),
});

export const GlossaryTermModel = defineCollection({
  model: "GlossaryTerm",
  collection: "glossary_terms",
  domain: D,
  ownership: "global",
  versioned: true,
  description: "Plain-language definitions of poultry terms, searchable.",
  fields: {
    slug: str({ required: true, max: 80, lowercase: true }),
    locale: str({ required: true, max: 10 }),
    term: str({ required: true, max: 120 }),
    definition: text(2000),
    category: str({ required: true, max: 60 }),
    relatedSlugs: { type: [str({ max: 80 })], default: undefined },
    regionCode,
    status: enumOf(CONTENT_STATUSES, { required: true, default: "draft" }),
    sources,
  },
  indexes: [
    { fields: { slug: 1, locale: 1 }, options: { unique: true }, why: "Open a term by slug in a language" },
    { fields: { term: "text", definition: "text" }, options: { weights: { term: 5, definition: 1 }, default_language: "none" }, why: "Glossary search" },
  ],
});

