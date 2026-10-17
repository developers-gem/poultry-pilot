import { useState } from "react";
import { useFarmInfo } from "../api/farm";
import { useApiQuery, useFarmMutation } from "../api/hooks";
import { EmptyState, LoadingState, QueryState } from "../components/states";
import { Badge, Button, GlassCard, PageHeader, ProgressBar, Stat, StatGrid } from "../components/ui";
import { label, num } from "../lib/format";

interface CourseSummary { slug: string; title: string; summary: string | null; level: string; category: string; lessons: number; minutes: number; completedLessons: number }
interface Course { slug: string; title: string; summary: string | null; author: string | null; references: { name: string; url?: string }[]; lessons: { lessonId: string; title: string; content: string | null; minutes: number | null; completedAt: string | null }[]; progress: { completed: number; total: number; percent: number } }

function CourseDetail({ slug }: { slug: string }) {
  const course = useApiQuery<Course>(`/content/courses/${slug}`);
  const complete = useFarmMutation<{ _lesson: string }>("POST", (b) => `/content/courses/${slug}/lessons/${b._lesson}/complete`, { success: "Lesson done", root: true });
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  return (
    <QueryState query={course} loading={<LoadingState rows={2} />}>
      {(c) => (
        <div className="mt-4 space-y-2">
          {c.lessons.map((l, i) => (
            <div key={l.lessonId} className="panel-inner rounded-xl p-3 text-[13px]">
              <button type="button" aria-expanded={openLesson === l.lessonId} onClick={() => setOpenLesson(openLesson === l.lessonId ? null : l.lessonId)} className="flex w-full items-center justify-between gap-2 text-left">
                <span><span className="text-inksoft">{i + 1}.</span> <span className="font-medium">{l.title}</span>{l.minutes ? <span className="text-inksoft"> · {l.minutes} min</span> : null}</span>
                {l.completedAt ? <Badge tone="mint">Done</Badge> : <span className="text-[12px] text-inksoft">Read</span>}
              </button>
              {openLesson === l.lessonId ? (
                <div className="mt-3 border-t border-white/60 pt-3">
                  {(l.content ?? "").split(/\n{2,}/).map((p, j) => <p key={j} className="mb-2 leading-relaxed">{p}</p>)}
                  {!l.completedAt ? <Button className="mt-1" onClick={() => complete.mutate({ _lesson: l.lessonId })}>Mark lesson done</Button> : null}
                </div>
              ) : null}
            </div>
          ))}
          {c.references.length ? <p className="pt-1 text-[11px] text-inksoft">Sources: {c.references.map((r) => r.name).join("; ")}</p> : null}
        </div>
      )}
    </QueryState>
  );
}

export function TrainingPage() {
  const { farm } = useFarmInfo();
  const courses = useApiQuery<{ items: CourseSummary[] }>(`/content/courses${farm?.countryCode ? `?region=${farm.countryCode}` : ""}`);
  const [open, setOpen] = useState<string | null>(null);
  const list = courses.data?.items ?? [];
  const total = list.reduce((t, c) => t + c.lessons, 0);
  const done = list.reduce((t, c) => t + c.completedLessons, 0);
  const next = list.find((c) => c.completedLessons < c.lessons);
  return (
    <>
      <PageHeader eyebrow="Training" title="Poultry farming courses" subtitle="Short lessons from your first chick to a farm that prices and sells deliberately. Your progress is saved to your account." />
      <StatGrid>
        <Stat label="Course progress" value={total ? `${Math.round((done / total) * 100)}%` : "—"} badge={`${done}/${total}`} badgeTone="mint" />
        <Stat label="Lessons completed" value={num(done)} hint="Saved to your account" />
        <Stat label="Courses" value={num(list.length)} badgeTone="accent" hint={`${num(list.reduce((t, c) => t + c.minutes, 0))} minutes of lessons`} />
        <Stat label="Up next" value={next ? next.title : list.length ? "All done" : "—"} hint={next ? `${next.lessons - next.completedLessons} lessons left` : undefined} />
      </StatGrid>
      <QueryState query={courses} isEmpty={(x) => !x.items.length} empty={<GlassCard><EmptyState title="No courses published yet." body="Courses appear here once the PoultryPilot editors publish them." /></GlassCard>}>
        {(x) => (
          <div className="grid gap-4 lg:grid-cols-2">
            {x.items.map((c) => (
              <GlassCard key={c.slug}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-brand-ink">{c.title}</h2>
                    <p className="mt-1 text-[13px] text-inksoft">{c.summary}</p>
                  </div>
                  <Badge tone="cyan">{label(c.level)}</Badge>
                </div>
                <div className="mt-3"><ProgressBar value={c.lessons ? (c.completedLessons / c.lessons) * 100 : 0} tone="mint" label={`Progress in ${c.title}`} /></div>
                <p className="mt-1.5 text-[12px] text-inksoft">{c.completedLessons}/{c.lessons} lessons · {c.minutes} min</p>
                <Button variant="glass" className="mt-3" aria-expanded={open === c.slug} onClick={() => setOpen(open === c.slug ? null : c.slug)}>{open === c.slug ? "Close course" : c.completedLessons ? "Continue" : "Start course"}</Button>
                {open === c.slug ? <CourseDetail slug={c.slug} /> : null}
              </GlassCard>
            ))}
          </div>
        )}
      </QueryState>
    </>
  );
}
