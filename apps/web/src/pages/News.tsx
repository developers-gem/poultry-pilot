import { useFarmInfo } from "../api/farm";
import { useApiQuery } from "../api/hooks";
import { EmptyState, QueryState } from "../components/states";
import { GlassCard, PageHeader } from "../components/ui";
import { label, money, num } from "../lib/format";
import { ArticleItem, type ArticleSummary } from "./content-ui";

interface Listing { category: string; unit: string; price: { amountMinor: number; currency: string } }

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
};

/**
 * News, disease information and real prices. Everything comes from the API: editor-reviewed news with its source,
 * disease articles with references, and prices from listings currently on PoultryMarket (nothing is written here).
 */
export function NewsPage() {
  const { farm } = useFarmInfo();
  const region = farm?.countryCode ? `region=${farm.countryCode}&` : "";
  const news = useApiQuery<{ items: ArticleSummary[] }>(`/content/news?${region}limit=30`);
  const disease = useApiQuery<{ items: ArticleSummary[] }>(`/content/articles?${region}kind=disease&limit=30`);
  const listings = useApiQuery<{ items: Listing[] }>(`/market/listings${farm?.countryCode ? `?region=${farm.countryCode}` : ""}`);
  const groups = new Map<string, { category: string; unit: string; currency: string; prices: number[] }>();
  for (const l of listings.data?.items ?? []) {
    const k = `${l.category}|${l.unit}|${l.price.currency}`;
    const g = groups.get(k) ?? { category: l.category, unit: l.unit, currency: l.price.currency, prices: [] };
    g.prices.push(l.price.amountMinor);
    groups.set(k, g);
  }
  return (
    <>
      <PageHeader eyebrow="Poultry News" title="Updates, disease information & prices" subtitle="Reviewed farming news with links to the original source, disease information with references, and what sellers are asking on PoultryMarket." />
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h2 className="mb-3 font-display text-lg font-semibold text-brand-ink">Farming updates</h2>
          <QueryState query={news} isEmpty={(x) => !x.items.length} empty={<EmptyState title="No news for your region yet." body="News appears once the PoultryPilot editors review and publish it." />}>
            {(x) => <ul className="space-y-2">{x.items.map((a) => <ArticleItem key={a.id} a={a} />)}</ul>}
          </QueryState>
        </GlassCard>
        <GlassCard>
          <h2 className="mb-3 font-display text-lg font-semibold text-rose-ink">Disease information</h2>
          <QueryState query={disease} isEmpty={(x) => !x.items.length} empty={<EmptyState title="No disease information published yet." />}>
            {(x) => <ul className="space-y-2">{x.items.map((a) => <ArticleItem key={a.id} a={a} />)}</ul>}
          </QueryState>
        </GlassCard>
      </div>
      <GlassCard className="mt-4">
        <h2 className="font-display text-lg font-semibold text-mint-ink">Prices on PoultryMarket now</h2>
        <p className="mb-3 text-[12px] text-inksoft">Median asking price across active listings{farm?.countryCode ? ` in ${farm.countryCode}` : ""}. Asking prices, not completed sales.</p>
        <QueryState query={listings} isEmpty={() => groups.size === 0} empty={<EmptyState title="No active listings to price from." />}>
          {() => (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...groups.values()].map((g) => (
                <div key={`${g.category}${g.unit}${g.currency}`} className="panel-inner rounded-xl p-3">
                  <p className="text-[12px] text-inksoft">{label(g.category)}</p>
                  <p className="font-display text-[18px] font-semibold">{money(median(g.prices), g.currency)} <span className="text-[12px] font-normal text-inksoft">per {g.unit}</span></p>
                  <p className="text-[11px] text-inksoft">{num(g.prices.length)} listing{g.prices.length > 1 ? "s" : ""} · {money(Math.min(...g.prices), g.currency)}–{money(Math.max(...g.prices), g.currency)}</p>
                </div>
              ))}
            </div>
          )}
        </QueryState>
      </GlassCard>
    </>
  );
}
