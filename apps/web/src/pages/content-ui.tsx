import { useState } from "react";
import { useApiQuery } from "../api/hooks";
import { LoadingState, QueryState } from "../components/states";
import { Badge } from "../components/ui";
import { label, shortDate } from "../lib/format";

export interface ArticleSummary { id: string; slug: string; kind: string; origin: string; title: string; summary: string | null; category: string; author: string | null; source: string | null; sourceUrl: string | null; publicationDate: string | null; region: string }
interface Article extends ArticleSummary { content: string | null; references: { name: string; url?: string }[]; disclaimer?: string; attribution?: string; disease?: { species?: string[]; signs?: string[]; transmission?: string; prevention?: string; reportingNote?: string } }

/** An article row that opens in place, loading its full text from the API. */
export function ArticleItem({ a }: { a: ArticleSummary }) {
  const [open, setOpen] = useState(false);
  const full = useApiQuery<Article>(`/content/articles/${a.slug}`, { enabled: open });
  return (
    <li className="panel-inner rounded-xl p-4">
      <p className="text-[11px] tracking-[0.12em] text-inksoft uppercase">{[label(a.category), a.region !== "GLOBAL" ? a.region : null, a.publicationDate ? shortDate(a.publicationDate) : null].filter(Boolean).join(" · ")}</p>
      <h3 className="mt-1 font-display text-[16px] font-semibold">{a.title}</h3>
      {a.summary ? <p className="mt-1 text-[13px] text-inksoft">{a.summary}</p> : null}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px]">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="font-medium text-brand-ink hover:underline">{open ? "Close" : "Read"}</button>
        {a.source ? <span className="text-inksoft">{a.source}{a.author ? ` · ${a.author}` : ""}</span> : a.author ? <span className="text-inksoft">{a.author}</span> : null}
        {a.sourceUrl ? <a href={a.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">Original source</a> : null}
      </div>
      {open ? (
        <div className="mt-3 border-t border-white/60 pt-3 text-[13px] leading-relaxed">
          <QueryState query={full} loading={<LoadingState rows={2} />}>
            {(x) => (
              <>
                {x.disease ? (
                  <dl className="mb-3 grid gap-2 sm:grid-cols-2">
                    {x.disease.signs?.length ? <div><dt className="text-[11px] tracking-[0.12em] text-inksoft uppercase">Signs</dt><dd>{x.disease.signs.join(", ")}</dd></div> : null}
                    {x.disease.transmission ? <div><dt className="text-[11px] tracking-[0.12em] text-inksoft uppercase">How it spreads</dt><dd>{x.disease.transmission}</dd></div> : null}
                    {x.disease.prevention ? <div><dt className="text-[11px] tracking-[0.12em] text-inksoft uppercase">Prevention</dt><dd>{x.disease.prevention}</dd></div> : null}
                    {x.disease.reportingNote ? <div className="sm:col-span-2"><Badge tone="rose">Reporting</Badge> <span>{x.disease.reportingNote}</span></div> : null}
                  </dl>
                ) : null}
                {(x.content ?? "").split(/\n{2,}/).filter(Boolean).map((p, i) => <p key={i} className="mb-2">{p}</p>)}
                {x.attribution ? <p className="text-[12px] text-inksoft">{x.attribution}</p> : null}
                {x.references.length ? (
                  <div className="mt-2 text-[12px] text-inksoft">
                    Sources:
                    <ul className="ml-4 list-disc">{x.references.map((r) => <li key={r.name}>{r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline">{r.name}</a> : r.name}</li>)}</ul>
                  </div>
                ) : null}
                {x.disclaimer ? <p className="mt-2 text-[12px] font-medium text-amber-ink">{x.disclaimer}</p> : null}
              </>
            )}
          </QueryState>
        </div>
      ) : null}
    </li>
  );
}
