import { ARTICLE_KINDS, CONTENT_STATUSES } from "@poultrypilot/constants";
import { Schema } from "mongoose";
import { SourceSchema, defineCollection, enumOf, instant, int, ref, str, text } from "./base.js";

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
          { lessonId: str({ required: true, max: 80 }), title: str({ required: true, max: 150 }), body: text(20_000), minutes: int({ max: 120 }), order: int({ default: 0 }) },
          { _id: false },
        ),
      ],
      default: [],
    },
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
    "Facts, guides, news and disease notices. News and disease notices must carry a source, a publication date and a region before they can be published.",
  fields: {
    kind: enumOf(ARTICLE_KINDS, { required: true }),
    slug: str({ required: true, max: 120, lowercase: true }),
    locale: str({ required: true, max: 10 }),
    title: str({ required: true, max: 200 }),
    summary: text(600),
    body: text(50_000),
    regionCode,
    tags: { type: [str({ max: 40, lowercase: true })], default: undefined },
    status: enumOf(CONTENT_STATUSES, { required: true, default: "draft" }),
    publishedAt: instant(),
    reviewedBy: str({ max: 120 }),
    reviewedAt: instant(),
    expiresAt: instant(),
    sources,
  },
  indexes: [
    { fields: { slug: 1, locale: 1 }, options: { unique: true }, why: "Open an article by slug" },
    { fields: { status: 1, kind: 1, locale: 1, regionCode: 1, publishedAt: -1 }, why: "Feed for a kind in my language and region (regionCode $in [mine, GLOBAL]), newest first" },
  ],
  configure: (schema) =>
    schema.pre("validate", function () {
      const kind = this.get("kind") as string;
      if (this.get("status") === "published" && (kind === "news" || kind === "disease_notice")) {
        if (!this.get("publishedAt")) this.invalidate("publishedAt", "Published news and disease notices need a publication date");
        if (!(this.get("sources") as unknown[])?.length) this.invalidate("sources", "Published news and disease notices need at least one source");
      }
      // Educational health and biosecurity content must cite where it comes from.
      const tags = (this.get("tags") as string[] | undefined) ?? [];
      if (this.get("status") === "published" && (tags.includes("health") || tags.includes("biosecurity")) && !(this.get("sources") as unknown[])?.length) {
        this.invalidate("sources", "Published health and biosecurity articles need at least one source");
      }
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
    status: enumOf(CONTENT_STATUSES, { required: true, default: "draft" }),
    sources,
  },
  indexes: [
    { fields: { slug: 1, locale: 1 }, options: { unique: true }, why: "Open a term by slug in a language" },
    { fields: { term: "text", definition: "text" }, options: { weights: { term: 5, definition: 1 }, default_language: "none" }, why: "Glossary search" },
  ],
});

