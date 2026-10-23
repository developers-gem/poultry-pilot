import { z } from "zod";
export declare const ContentArticleQuery: z.ZodObject<{
    kind: z.ZodOptional<z.ZodEnum<["fact", "guide", "news", "disease"]>>;
    category: z.ZodOptional<z.ZodEnum<["biosecurity", "health", "nutrition", "housing", "management", "hatchery", "welfare", "markets", "policy", "business", "general"]>>;
    region: z.ZodOptional<z.ZodString>;
    q: z.ZodOptional<z.ZodString>;
    locale: z.ZodDefault<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    locale: string;
    kind?: "news" | "disease" | "fact" | "guide" | undefined;
    category?: "hatchery" | "general" | "biosecurity" | "health" | "nutrition" | "housing" | "management" | "welfare" | "markets" | "policy" | "business" | undefined;
    region?: string | undefined;
    q?: string | undefined;
}, {
    limit?: number | undefined;
    kind?: "news" | "disease" | "fact" | "guide" | undefined;
    category?: "hatchery" | "general" | "biosecurity" | "health" | "nutrition" | "housing" | "management" | "welfare" | "markets" | "policy" | "business" | undefined;
    region?: string | undefined;
    q?: string | undefined;
    locale?: string | undefined;
}>;
export declare const NewsQuery: z.ZodObject<{
    category: z.ZodOptional<z.ZodEnum<["biosecurity", "health", "nutrition", "housing", "management", "hatchery", "welfare", "markets", "policy", "business", "general"]>>;
    region: z.ZodOptional<z.ZodString>;
    locale: z.ZodDefault<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    locale: string;
    category?: "hatchery" | "general" | "biosecurity" | "health" | "nutrition" | "housing" | "management" | "welfare" | "markets" | "policy" | "business" | undefined;
    region?: string | undefined;
}, {
    limit?: number | undefined;
    category?: "hatchery" | "general" | "biosecurity" | "health" | "nutrition" | "housing" | "management" | "welfare" | "markets" | "policy" | "business" | undefined;
    region?: string | undefined;
    locale?: string | undefined;
}>;
export declare const FactQuery: z.ZodObject<{
    region: z.ZodOptional<z.ZodString>;
    locale: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    locale: string;
    region?: string | undefined;
}, {
    region?: string | undefined;
    locale?: string | undefined;
}>;
export declare const GlossaryQuery: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    region: z.ZodOptional<z.ZodString>;
    locale: z.ZodDefault<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    locale: string;
    category?: string | undefined;
    region?: string | undefined;
    q?: string | undefined;
}, {
    limit?: number | undefined;
    category?: string | undefined;
    region?: string | undefined;
    q?: string | undefined;
    locale?: string | undefined;
}>;
export declare const CourseQuery: z.ZodObject<{
    category: z.ZodOptional<z.ZodEnum<["biosecurity", "health", "nutrition", "housing", "management", "hatchery", "welfare", "markets", "policy", "business", "general"]>>;
    region: z.ZodOptional<z.ZodString>;
    locale: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    locale: string;
    category?: "hatchery" | "general" | "biosecurity" | "health" | "nutrition" | "housing" | "management" | "welfare" | "markets" | "policy" | "business" | undefined;
    region?: string | undefined;
}, {
    category?: "hatchery" | "general" | "biosecurity" | "health" | "nutrition" | "housing" | "management" | "welfare" | "markets" | "policy" | "business" | undefined;
    region?: string | undefined;
    locale?: string | undefined;
}>;
export declare const LocaleQuery: z.ZodObject<{
    locale: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    locale: string;
}, {
    locale?: string | undefined;
}>;
/** Farm-scoped list (region defaults to the farm's country). */
export declare const ArticleListQuery: z.ZodObject<{
    kind: z.ZodOptional<z.ZodEnum<["fact", "guide", "news", "disease"]>>;
    tag: z.ZodOptional<z.ZodString>;
    region: z.ZodOptional<z.ZodString>;
    locale: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    locale: string;
    kind?: "news" | "disease" | "fact" | "guide" | undefined;
    region?: string | undefined;
    tag?: string | undefined;
}, {
    kind?: "news" | "disease" | "fact" | "guide" | undefined;
    region?: string | undefined;
    locale?: string | undefined;
    tag?: string | undefined;
}>;
export declare const ArticleRequest: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    kind: z.ZodEnum<["fact", "guide", "news", "disease"]>;
    origin: z.ZodDefault<z.ZodEnum<["original", "external"]>>;
    slug: z.ZodString;
    locale: z.ZodDefault<z.ZodString>;
    title: z.ZodString;
    summary: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    category: z.ZodEnum<["biosecurity", "health", "nutrition", "housing", "management", "hatchery", "welfare", "markets", "policy", "business", "general"]>;
    author: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodString>;
    sourceUrl: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    publicationDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    regionCode: z.ZodDefault<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    disease: z.ZodOptional<z.ZodObject<{
        species: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        signs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        transmission: z.ZodOptional<z.ZodString>;
        prevention: z.ZodOptional<z.ZodString>;
        reportingNote: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        species?: string[] | undefined;
        signs?: string[] | undefined;
        transmission?: string | undefined;
        prevention?: string | undefined;
        reportingNote?: string | undefined;
    }, {
        species?: string[] | undefined;
        signs?: string[] | undefined;
        transmission?: string | undefined;
        prevention?: string | undefined;
        reportingNote?: string | undefined;
    }>>;
    sources: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        url: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    }, "strict", z.ZodTypeAny, {
        name: string;
        url?: string | undefined;
    }, {
        name: string;
        url?: string | undefined;
    }>, "many">>;
}, "strict", z.ZodTypeAny, {
    kind: "news" | "disease" | "fact" | "guide";
    category: "hatchery" | "general" | "biosecurity" | "health" | "nutrition" | "housing" | "management" | "welfare" | "markets" | "policy" | "business";
    title: string;
    regionCode: string;
    locale: string;
    origin: "original" | "external";
    slug: string;
    disease?: {
        species?: string[] | undefined;
        signs?: string[] | undefined;
        transmission?: string | undefined;
        prevention?: string | undefined;
        reportingNote?: string | undefined;
    } | undefined;
    source?: string | undefined;
    summary?: string | undefined;
    content?: string | undefined;
    author?: string | undefined;
    sourceUrl?: string | undefined;
    publicationDate?: string | undefined;
    tags?: string[] | undefined;
    sources?: {
        name: string;
        url?: string | undefined;
    }[] | undefined;
}, {
    kind: "news" | "disease" | "fact" | "guide";
    category: "hatchery" | "general" | "biosecurity" | "health" | "nutrition" | "housing" | "management" | "welfare" | "markets" | "policy" | "business";
    title: string;
    slug: string;
    disease?: {
        species?: string[] | undefined;
        signs?: string[] | undefined;
        transmission?: string | undefined;
        prevention?: string | undefined;
        reportingNote?: string | undefined;
    } | undefined;
    source?: string | undefined;
    summary?: string | undefined;
    regionCode?: string | undefined;
    locale?: string | undefined;
    origin?: "original" | "external" | undefined;
    content?: string | undefined;
    author?: string | undefined;
    sourceUrl?: string | undefined;
    publicationDate?: string | undefined;
    tags?: string[] | undefined;
    sources?: {
        name: string;
        url?: string | undefined;
    }[] | undefined;
}>, {
    kind: "news" | "disease" | "fact" | "guide";
    category: "hatchery" | "general" | "biosecurity" | "health" | "nutrition" | "housing" | "management" | "welfare" | "markets" | "policy" | "business";
    title: string;
    regionCode: string;
    locale: string;
    origin: "original" | "external";
    slug: string;
    disease?: {
        species?: string[] | undefined;
        signs?: string[] | undefined;
        transmission?: string | undefined;
        prevention?: string | undefined;
        reportingNote?: string | undefined;
    } | undefined;
    source?: string | undefined;
    summary?: string | undefined;
    content?: string | undefined;
    author?: string | undefined;
    sourceUrl?: string | undefined;
    publicationDate?: string | undefined;
    tags?: string[] | undefined;
    sources?: {
        name: string;
        url?: string | undefined;
    }[] | undefined;
}, {
    kind: "news" | "disease" | "fact" | "guide";
    category: "hatchery" | "general" | "biosecurity" | "health" | "nutrition" | "housing" | "management" | "welfare" | "markets" | "policy" | "business";
    title: string;
    slug: string;
    disease?: {
        species?: string[] | undefined;
        signs?: string[] | undefined;
        transmission?: string | undefined;
        prevention?: string | undefined;
        reportingNote?: string | undefined;
    } | undefined;
    source?: string | undefined;
    summary?: string | undefined;
    regionCode?: string | undefined;
    locale?: string | undefined;
    origin?: "original" | "external" | undefined;
    content?: string | undefined;
    author?: string | undefined;
    sourceUrl?: string | undefined;
    publicationDate?: string | undefined;
    tags?: string[] | undefined;
    sources?: {
        name: string;
        url?: string | undefined;
    }[] | undefined;
}>, {
    kind: "news" | "disease" | "fact" | "guide";
    category: "hatchery" | "general" | "biosecurity" | "health" | "nutrition" | "housing" | "management" | "welfare" | "markets" | "policy" | "business";
    title: string;
    regionCode: string;
    locale: string;
    origin: "original" | "external";
    slug: string;
    disease?: {
        species?: string[] | undefined;
        signs?: string[] | undefined;
        transmission?: string | undefined;
        prevention?: string | undefined;
        reportingNote?: string | undefined;
    } | undefined;
    source?: string | undefined;
    summary?: string | undefined;
    content?: string | undefined;
    author?: string | undefined;
    sourceUrl?: string | undefined;
    publicationDate?: string | undefined;
    tags?: string[] | undefined;
    sources?: {
        name: string;
        url?: string | undefined;
    }[] | undefined;
}, {
    kind: "news" | "disease" | "fact" | "guide";
    category: "hatchery" | "general" | "biosecurity" | "health" | "nutrition" | "housing" | "management" | "welfare" | "markets" | "policy" | "business";
    title: string;
    slug: string;
    disease?: {
        species?: string[] | undefined;
        signs?: string[] | undefined;
        transmission?: string | undefined;
        prevention?: string | undefined;
        reportingNote?: string | undefined;
    } | undefined;
    source?: string | undefined;
    summary?: string | undefined;
    regionCode?: string | undefined;
    locale?: string | undefined;
    origin?: "original" | "external" | undefined;
    content?: string | undefined;
    author?: string | undefined;
    sourceUrl?: string | undefined;
    publicationDate?: string | undefined;
    tags?: string[] | undefined;
    sources?: {
        name: string;
        url?: string | undefined;
    }[] | undefined;
}>;
export declare const UpdateArticleRequest: z.ZodObject<{
    kind: z.ZodEnum<["fact", "guide", "news", "disease"]>;
    origin: z.ZodDefault<z.ZodEnum<["original", "external"]>>;
    slug: z.ZodString;
    locale: z.ZodDefault<z.ZodString>;
    title: z.ZodString;
    summary: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    category: z.ZodEnum<["biosecurity", "health", "nutrition", "housing", "management", "hatchery", "welfare", "markets", "policy", "business", "general"]>;
    author: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodString>;
    sourceUrl: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    publicationDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    regionCode: z.ZodDefault<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    disease: z.ZodOptional<z.ZodObject<{
        species: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        signs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        transmission: z.ZodOptional<z.ZodString>;
        prevention: z.ZodOptional<z.ZodString>;
        reportingNote: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        species?: string[] | undefined;
        signs?: string[] | undefined;
        transmission?: string | undefined;
        prevention?: string | undefined;
        reportingNote?: string | undefined;
    }, {
        species?: string[] | undefined;
        signs?: string[] | undefined;
        transmission?: string | undefined;
        prevention?: string | undefined;
        reportingNote?: string | undefined;
    }>>;
    sources: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        url: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    }, "strict", z.ZodTypeAny, {
        name: string;
        url?: string | undefined;
    }, {
        name: string;
        url?: string | undefined;
    }>, "many">>;
} & {
    version: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    version: number;
    kind: "news" | "disease" | "fact" | "guide";
    category: "hatchery" | "general" | "biosecurity" | "health" | "nutrition" | "housing" | "management" | "welfare" | "markets" | "policy" | "business";
    title: string;
    regionCode: string;
    locale: string;
    origin: "original" | "external";
    slug: string;
    disease?: {
        species?: string[] | undefined;
        signs?: string[] | undefined;
        transmission?: string | undefined;
        prevention?: string | undefined;
        reportingNote?: string | undefined;
    } | undefined;
    source?: string | undefined;
    summary?: string | undefined;
    content?: string | undefined;
    author?: string | undefined;
    sourceUrl?: string | undefined;
    publicationDate?: string | undefined;
    tags?: string[] | undefined;
    sources?: {
        name: string;
        url?: string | undefined;
    }[] | undefined;
}, {
    version: number;
    kind: "news" | "disease" | "fact" | "guide";
    category: "hatchery" | "general" | "biosecurity" | "health" | "nutrition" | "housing" | "management" | "welfare" | "markets" | "policy" | "business";
    title: string;
    slug: string;
    disease?: {
        species?: string[] | undefined;
        signs?: string[] | undefined;
        transmission?: string | undefined;
        prevention?: string | undefined;
        reportingNote?: string | undefined;
    } | undefined;
    source?: string | undefined;
    summary?: string | undefined;
    regionCode?: string | undefined;
    locale?: string | undefined;
    origin?: "original" | "external" | undefined;
    content?: string | undefined;
    author?: string | undefined;
    sourceUrl?: string | undefined;
    publicationDate?: string | undefined;
    tags?: string[] | undefined;
    sources?: {
        name: string;
        url?: string | undefined;
    }[] | undefined;
}>;
export declare const EditorArticleQuery: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["draft", "in_review", "published", "archived"]>>;
    kind: z.ZodOptional<z.ZodEnum<["fact", "guide", "news", "disease"]>>;
    q: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    status?: "draft" | "in_review" | "published" | "archived" | undefined;
    kind?: "news" | "disease" | "fact" | "guide" | undefined;
    q?: string | undefined;
}, {
    status?: "draft" | "in_review" | "published" | "archived" | undefined;
    limit?: number | undefined;
    kind?: "news" | "disease" | "fact" | "guide" | undefined;
    q?: string | undefined;
}>;
export declare const RejectRequest: z.ZodObject<{
    reason: z.ZodString;
}, "strict", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const ImportRequest: z.ZodObject<{
    kind: z.ZodDefault<z.ZodEnum<["fact", "guide", "news", "disease"]>>;
    items: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        summary: z.ZodOptional<z.ZodString>;
        sourceUrl: z.ZodEffects<z.ZodString, string, string>;
        publicationDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        author: z.ZodOptional<z.ZodString>;
        source: z.ZodString;
        regionCode: z.ZodDefault<z.ZodString>;
        category: z.ZodDefault<z.ZodEnum<["biosecurity", "health", "nutrition", "housing", "management", "hatchery", "welfare", "markets", "policy", "business", "general"]>>;
    }, "strict", z.ZodTypeAny, {
        source: string;
        category: "hatchery" | "general" | "biosecurity" | "health" | "nutrition" | "housing" | "management" | "welfare" | "markets" | "policy" | "business";
        title: string;
        regionCode: string;
        sourceUrl: string;
        summary?: string | undefined;
        author?: string | undefined;
        publicationDate?: string | undefined;
    }, {
        source: string;
        title: string;
        sourceUrl: string;
        summary?: string | undefined;
        category?: "hatchery" | "general" | "biosecurity" | "health" | "nutrition" | "housing" | "management" | "welfare" | "markets" | "policy" | "business" | undefined;
        regionCode?: string | undefined;
        author?: string | undefined;
        publicationDate?: string | undefined;
    }>, "many">;
}, "strict", z.ZodTypeAny, {
    kind: "news" | "disease" | "fact" | "guide";
    items: {
        source: string;
        category: "hatchery" | "general" | "biosecurity" | "health" | "nutrition" | "housing" | "management" | "welfare" | "markets" | "policy" | "business";
        title: string;
        regionCode: string;
        sourceUrl: string;
        summary?: string | undefined;
        author?: string | undefined;
        publicationDate?: string | undefined;
    }[];
}, {
    items: {
        source: string;
        title: string;
        sourceUrl: string;
        summary?: string | undefined;
        category?: "hatchery" | "general" | "biosecurity" | "health" | "nutrition" | "housing" | "management" | "welfare" | "markets" | "policy" | "business" | undefined;
        regionCode?: string | undefined;
        author?: string | undefined;
        publicationDate?: string | undefined;
    }[];
    kind?: "news" | "disease" | "fact" | "guide" | undefined;
}>;
export declare const GlossaryRequest: z.ZodObject<{
    slug: z.ZodString;
    locale: z.ZodDefault<z.ZodString>;
    term: z.ZodString;
    definition: z.ZodString;
    category: z.ZodString;
    relatedSlugs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    regionCode: z.ZodDefault<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["draft", "published"]>>;
    sources: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        url: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    }, "strict", z.ZodTypeAny, {
        name: string;
        url?: string | undefined;
    }, {
        name: string;
        url?: string | undefined;
    }>, "many">>;
    version: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    status: "draft" | "published";
    category: string;
    regionCode: string;
    locale: string;
    slug: string;
    sources: {
        name: string;
        url?: string | undefined;
    }[];
    term: string;
    definition: string;
    version?: number | undefined;
    relatedSlugs?: string[] | undefined;
}, {
    category: string;
    slug: string;
    term: string;
    definition: string;
    status?: "draft" | "published" | undefined;
    version?: number | undefined;
    regionCode?: string | undefined;
    locale?: string | undefined;
    sources?: {
        name: string;
        url?: string | undefined;
    }[] | undefined;
    relatedSlugs?: string[] | undefined;
}>;
export declare const CourseRequest: z.ZodObject<{
    slug: z.ZodString;
    locale: z.ZodDefault<z.ZodString>;
    title: z.ZodString;
    summary: z.ZodOptional<z.ZodString>;
    level: z.ZodDefault<z.ZodEnum<["beginner", "intermediate", "advanced"]>>;
    order: z.ZodDefault<z.ZodNumber>;
    category: z.ZodDefault<z.ZodEnum<["biosecurity", "health", "nutrition", "housing", "management", "hatchery", "welfare", "markets", "policy", "business", "general"]>>;
    regionCode: z.ZodDefault<z.ZodString>;
    author: z.ZodOptional<z.ZodString>;
    lessons: z.ZodArray<z.ZodObject<{
        lessonId: z.ZodString;
        title: z.ZodString;
        content: z.ZodOptional<z.ZodString>;
        minutes: z.ZodOptional<z.ZodNumber>;
        order: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        title: string;
        order: number;
        lessonId: string;
        content?: string | undefined;
        minutes?: number | undefined;
    }, {
        title: string;
        lessonId: string;
        content?: string | undefined;
        order?: number | undefined;
        minutes?: number | undefined;
    }>, "many">;
    status: z.ZodDefault<z.ZodEnum<["draft", "published"]>>;
    sources: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        url: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    }, "strict", z.ZodTypeAny, {
        name: string;
        url?: string | undefined;
    }, {
        name: string;
        url?: string | undefined;
    }>, "many">>;
    version: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    status: "draft" | "published";
    category: "hatchery" | "general" | "biosecurity" | "health" | "nutrition" | "housing" | "management" | "welfare" | "markets" | "policy" | "business";
    title: string;
    regionCode: string;
    locale: string;
    slug: string;
    sources: {
        name: string;
        url?: string | undefined;
    }[];
    level: "beginner" | "intermediate" | "advanced";
    order: number;
    lessons: {
        title: string;
        order: number;
        lessonId: string;
        content?: string | undefined;
        minutes?: number | undefined;
    }[];
    version?: number | undefined;
    summary?: string | undefined;
    author?: string | undefined;
}, {
    title: string;
    slug: string;
    lessons: {
        title: string;
        lessonId: string;
        content?: string | undefined;
        order?: number | undefined;
        minutes?: number | undefined;
    }[];
    status?: "draft" | "published" | undefined;
    version?: number | undefined;
    summary?: string | undefined;
    category?: "hatchery" | "general" | "biosecurity" | "health" | "nutrition" | "housing" | "management" | "welfare" | "markets" | "policy" | "business" | undefined;
    regionCode?: string | undefined;
    locale?: string | undefined;
    author?: string | undefined;
    sources?: {
        name: string;
        url?: string | undefined;
    }[] | undefined;
    level?: "beginner" | "intermediate" | "advanced" | undefined;
    order?: number | undefined;
}>;
export declare const LessonParams: z.ZodObject<{
    slug: z.ZodString;
    lessonId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    slug: string;
    lessonId: string;
}, {
    slug: string;
    lessonId: string;
}>;
export declare const SlugParams: z.ZodObject<{
    slug: z.ZodString;
}, "strip", z.ZodTypeAny, {
    slug: string;
}, {
    slug: string;
}>;
export declare const IdParams: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const ReportType: z.ZodEnum<["farm", "flock", "egg", "feed", "health", "hatchery", "biosecurity", "financial", "marketplace"]>;
export declare const ReportQuery: z.ZodEffects<z.ZodObject<{
    format: z.ZodDefault<z.ZodEnum<["pdf", "csv", "xlsx", "json"]>>;
    from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    flockId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    format: "pdf" | "csv" | "xlsx" | "json";
    from?: string | undefined;
    to?: string | undefined;
    flockId?: string | undefined;
}, {
    from?: string | undefined;
    to?: string | undefined;
    flockId?: string | undefined;
    format?: "pdf" | "csv" | "xlsx" | "json" | undefined;
}>, {
    format: "pdf" | "csv" | "xlsx" | "json";
    from?: string | undefined;
    to?: string | undefined;
    flockId?: string | undefined;
}, {
    from?: string | undefined;
    to?: string | undefined;
    flockId?: string | undefined;
    format?: "pdf" | "csv" | "xlsx" | "json" | undefined;
}>;
