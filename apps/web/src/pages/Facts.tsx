import { useFarmInfo } from "../api/farm";
import { useApiQuery } from "../api/hooks";
import { EmptyState, QueryState } from "../components/states";
import { GlassCard, PageHeader, SectionTitle } from "../components/ui";
import { ArticleItem, type ArticleSummary } from "./content-ui";

export function FactsPage() {
  const { farm } = useFarmInfo();
  const region = farm?.countryCode ? `region=${farm.countryCode}&` : "";
  const fact = useApiQuery<{ fact: (ArticleSummary & { content: string | null }) | null }>(`/content/facts/today${farm?.countryCode ? `?region=${farm.countryCode}` : ""}`);
  const guides = useApiQuery<{ items: ArticleSummary[] }>(`/content/articles?${region}kind=guide&limit=100`);
  const facts = useApiQuery<{ items: ArticleSummary[] }>(`/content/articles?${region}kind=fact&limit=100`);
  return (
    <>
      <PageHeader eyebrow="Poultry Facts" title="Best practices handbook" subtitle="Quick reference for broilers, layers, disease prevention and feeding, written and sourced by the PoultryPilot editors. Check it before you change a routine." />
      <QueryState query={fact} loading={null}>
        {(x) => (x.fact ? (
          <GlassCard className="mb-4">
            <p className="text-[12px] tracking-[0.2em] text-inksoft uppercase">Fact of the day</p>
            <p className="mt-2 font-display text-xl font-semibold">{x.fact.title}</p>
            <p className="mt-1 text-[14px] text-inksoft">{x.fact.summary ?? x.fact.content}</p>
          </GlassCard>
        ) : null)}
      </QueryState>
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle hint="Step-by-step guides">Management guides</SectionTitle>
          <QueryState query={guides} isEmpty={(x) => !x.items.length} empty={<EmptyState title="No guides published yet." />}>
            {(x) => <ul className="space-y-2">{x.items.map((a) => <ArticleItem key={a.id} a={a} />)}</ul>}
          </QueryState>
        </GlassCard>
        <GlassCard>
          <SectionTitle hint="Short, sourced facts">Quick facts</SectionTitle>
          <QueryState query={facts} isEmpty={(x) => !x.items.length} empty={<EmptyState title="No facts published yet." body="Facts appear here once the PoultryPilot editors publish them." />}>
            {(x) => <ul className="space-y-2">{x.items.map((a) => <ArticleItem key={a.id} a={a} />)}</ul>}
          </QueryState>
        </GlassCard>
      </div>
    </>
  );
}
