import { useMemo, useState } from "react";
import { useFarmInfo } from "../api/farm";
import { useApiQuery } from "../api/hooks";
import { EmptyState, QueryState } from "../components/states";
import { GlassCard, PageHeader } from "../components/ui";

interface Term { slug: string; term: string; definition: string | null; category: string; relatedSlugs: string[] }

export function GlossaryPage() {
  const { farm } = useFarmInfo();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const terms = useApiQuery<{ items: Term[] }>(`/content/glossary?limit=200${farm?.countryCode ? `&region=${farm.countryCode}` : ""}`);
  const all = terms.data?.items ?? [];
  const categories = useMemo(() => [...new Set(all.map((t) => t.category))].sort(), [all]);
  const shown = all.filter((t) => (!cat || t.category === cat) && (!q || `${t.term} ${t.definition ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  const letters = [...new Set(shown.map((t) => t.term[0]!.toUpperCase()))].sort();
  return (
    <>
      <PageHeader eyebrow="Poultry Glossary" title="Farming terms, simply explained" subtitle="Look up the words you see across PoultryPilot, from brooding to break-even price." />
      <GlassCard className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search terms…" aria-label="Search terms" className="panel-inner min-w-0 flex-1 rounded-xl px-3 py-2.5 text-[14px]" />
          <div className="flex flex-wrap gap-1">
            {["", ...categories].map((c) => (
              <button key={c || "all"} type="button" onClick={() => setCat(c)} className={`rounded-xl px-3 py-1.5 text-[12px] font-medium ${cat === c ? "bg-ink text-white" : "text-inksoft hover:bg-white/60"}`}>{c || "All"}</button>
            ))}
          </div>
        </div>
        {letters.length > 1 ? <nav aria-label="Jump to letter" className="mt-3 flex flex-wrap gap-1 text-[12px]">{letters.map((l) => <a key={l} href={`#letter-${l}`} className="rounded-md px-2 py-1 text-inksoft hover:bg-white/60">{l}</a>)}</nav> : null}
      </GlassCard>
      <QueryState query={terms} isEmpty={() => !all.length} empty={<GlassCard><EmptyState title="No glossary terms published yet." /></GlassCard>}>
        {() => (shown.length === 0 ? <GlassCard><EmptyState title="No terms match." /></GlassCard> : (
          <div className="space-y-4">
            {letters.map((l) => (
              <GlassCard key={l}>
                <h2 id={`letter-${l}`} className="mb-3 font-display text-lg font-semibold text-brand-ink">{l}</h2>
                <dl className="grid gap-3 md:grid-cols-2">
                  {shown.filter((t) => t.term[0]!.toUpperCase() === l).map((t) => (
                    <div key={t.slug} className="panel-inner rounded-xl p-3">
                      <dt className="font-semibold">{t.term} <span className="text-[11px] font-normal text-inksoft">· {t.category}</span></dt>
                      <dd className="mt-1 text-[13px] text-inksoft">{t.definition}</dd>
                    </div>
                  ))}
                </dl>
              </GlassCard>
            ))}
          </div>
        ))}
      </QueryState>
    </>
  );
}
