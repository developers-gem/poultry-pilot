import {
  ArticleRequest,
  ContentArticleQuery,
  CourseQuery,
  CourseRequest,
  EditorArticleQuery,
  FactQuery,
  GlossaryQuery,
  GlossaryRequest,
  IdParams,
  ImportRequest,
  LessonParams,
  LocaleQuery,
  NewsQuery,
  RejectRequest,
  SlugParams,
  UpdateArticleRequest,
} from "@poultrypilot/validation";
import { Router, type Request } from "express";
import type { ContentService } from "../../services/content.service.js";
import { validate } from "../middleware/core.js";

const q = <T>(req: Request) => req.query as unknown as T;
const p = (req: Request, k: string) => req.params[k] as string;
const ctxOf = (req: Request) => ({ userId: req.auth!.userId, sessionId: req.auth!.sessionId, requestId: req.id as string });
const locale = (req: Request) => (req.query["locale"] as string | undefined) ?? "en";

/** /api/v1/content — published content for any signed-in user, filtered by region. */
export function readerContentRoutes(c: ContentService): Router {
  const r = Router();
  r.get("/articles", validate("query", ContentArticleQuery), async (req, res) => res.json({ items: await c.listArticles(ctxOf(req), q(req)) }));
  r.get("/articles/:slug", validate("params", SlugParams), validate("query", LocaleQuery), async (req, res) => res.json(await c.getArticle(ctxOf(req), p(req, "slug"), locale(req))));
  r.get("/news", validate("query", NewsQuery), async (req, res) => res.json({ items: await c.news(ctxOf(req), q(req)) }));
  r.get("/facts/today", validate("query", FactQuery), async (req, res) => res.json({ fact: await c.factOfTheDay(ctxOf(req), q(req)) }));
  r.get("/glossary", validate("query", GlossaryQuery), async (req, res) => res.json({ items: await c.glossary(ctxOf(req), q(req)) }));
  r.get("/courses", validate("query", CourseQuery), async (req, res) => res.json({ items: await c.courses(ctxOf(req), q(req)) }));
  r.get("/courses/:slug", validate("params", SlugParams), validate("query", LocaleQuery), async (req, res) => res.json(await c.course(ctxOf(req), p(req, "slug"), locale(req))));
  r.post("/courses/:slug/lessons/:lessonId/complete", validate("params", LessonParams), validate("query", LocaleQuery), async (req, res) => res.json(await c.completeLesson(ctxOf(req), p(req, "slug"), p(req, "lessonId"), locale(req))));
  return r;
}

/** /api/v1/admin/content — editorial work for PoultryPilot content staff (platform roles, checked in the service). */
export function editorialContentRoutes(c: ContentService): Router {
  const r = Router();
  r.get("/articles", validate("query", EditorArticleQuery), async (req, res) => res.json({ items: await c.editorList(ctxOf(req), q(req)) }));
  r.post("/articles", validate("body", ArticleRequest), async (req, res) => res.status(201).json(await c.createArticle(ctxOf(req), req.body)));
  r.get("/articles/:id", validate("params", IdParams), async (req, res) => res.json(await c.editorGet(ctxOf(req), p(req, "id"))));
  r.put("/articles/:id", validate("params", IdParams), validate("body", UpdateArticleRequest), async (req, res) => res.json(await c.updateArticle(ctxOf(req), p(req, "id"), req.body)));
  r.post("/articles/:id/submit", validate("params", IdParams), async (req, res) => res.json(await c.submit(ctxOf(req), p(req, "id"))));
  r.post("/articles/:id/publish", validate("params", IdParams), async (req, res) => res.json(await c.publish(ctxOf(req), p(req, "id"))));
  r.post("/articles/:id/reject", validate("params", IdParams), validate("body", RejectRequest), async (req, res) => res.json(await c.reject(ctxOf(req), p(req, "id"), req.body.reason)));
  r.post("/articles/:id/archive", validate("params", IdParams), async (req, res) => res.json(await c.archive(ctxOf(req), p(req, "id"))));
  r.post("/import", validate("body", ImportRequest), async (req, res) => res.status(201).json(await c.importExternal(ctxOf(req), req.body.items, req.body.kind)));
  r.put("/glossary", validate("body", GlossaryRequest), async (req, res) => res.json(await c.upsertGlossary(ctxOf(req), req.body)));
  r.put("/courses", validate("body", CourseRequest), async (req, res) => res.json(await c.upsertCourse(ctxOf(req), req.body)));
  return r;
}
