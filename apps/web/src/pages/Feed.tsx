import { FEED_STAGES } from "@poultrypilot/constants";
import { useAuth } from "../api/auth";
import { useFarmInfo, useFlocks } from "../api/farm";
import { useFarmMutation, useFarmQuery } from "../api/hooks";
import { FormCard } from "../components/forms";
import { QueryState } from "../components/states";
import { DataTable } from "../components/table";
import { Badge, ConfirmButton, GlassCard, MiniBars, PageHeader, SectionTitle, Stat, StatGrid } from "../components/ui";
import { addDays, label, money, num, shortDate, toMinor } from "../lib/format";

interface StockItem {
  itemId: string;
  name: string;
  stage: string;
  quantityKg: number;
  expiredKg: number;
  valueMinor: number;
  averageDailyUseKg: number | null;
  daysRemaining: number | null;
  status: string;
}
interface Analytics {
  flocks: { flockId: string; flockCode: string; type: string; birdsIn: number; currentBirdCount: number; feedConsumedKg: number; feedWastedKg: number; fcrWarning?: string | null; feedPerBirdKg: number | null; fcr: number | null; feedCostMinor: number; feedCostPerBirdMinor: number | null; eggsCollected: number; feedCostPerEggMinor: number | null; costsComplete: boolean }[];
  stock: { items: StockItem[]; totals: { quantityKg: number; valueMinor: number; averageDailyUseKg: number; daysRemaining: number | null } };
}
interface Lot {
  id: string;
  itemId: string;
  itemName: string;
  receivedDate: string;
  supplier?: string;
  batchNumber?: string;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost: { amountMinor: number; currency: string };
  expiryDate?: string;
}
interface Entry {
  id: string;
  date: string;
  flockId?: string;
  kind: string;
  quantityKg: number;
  feedItemId?: string;
  dailyRecordId?: string;
  cost?: { amountMinor: number; currency: string };
}

const STATUS_TONE: Record<string, "mint" | "amber" | "rose" | "cyan"> = { ok: "mint", low: "amber", critical: "rose", out: "rose", unknown: "cyan" };

export function FeedPage() {
  const { can } = useAuth();
  const { currency, today } = useFarmInfo();
  const flocks = useFlocks("active").data?.items ?? [];
  const analytics = useFarmQuery<Analytics>("/feed/analytics");
  const items = useFarmQuery<{ items: { id: string; name: string; feed?: { stage: string } }[] }>("/inventory/items?category=feed", { enabled: can("inventory.read") });
  const lots = useFarmQuery<{ items: Lot[] }>("/inventory/lots?category=feed", { enabled: can("inventory.read") });
  const entries = useFarmQuery<{ items: Entry[] }>(`/feed/consumption?from=${addDays(today, -13)}&to=${today}&limit=200`, { enabled: can("inventory.read") });
  const trends = useFarmQuery<{ days: { date: string; feedKg: number }[] }>(`/dashboard/trends?from=${addDays(today, -13)}&to=${today}`);
  const createItem = useFarmMutation<Record<string, unknown>, { id: string }>("POST", "/inventory/items");
  const purchase = useFarmMutation<Record<string, unknown> & { _id: string }>("POST", (b) => `/inventory/items/${b._id}/purchases`, { success: "Purchase recorded" });
  const use = useFarmMutation("POST", "/feed/consumption", { success: "Feed use recorded" });
  const removeEntry = useFarmMutation<{ _id: string }>("DELETE", (b) => `/feed/consumption/${b._id}`, { success: "Entry removed" });
  const a = analytics.data;
  const totals = a?.stock.totals;
  const birds = a?.flocks.reduce((t, f) => t + f.birdsIn, 0) ?? 0;
  const feedCost = a?.flocks.reduce((t, f) => t + f.feedCostMinor, 0) ?? 0;
  const eggs = a?.flocks.reduce((t, f) => t + f.eggsCollected, 0) ?? 0;
  const layerCost = a?.flocks.filter((f) => f.eggsCollected > 0).reduce((t, f) => t + f.feedCostMinor, 0) ?? 0;
  const feedItems = items.data?.items ?? [];
  const flockCode = (id?: string) => flocks.find((f) => f.id === id)?.flockCode ?? (id ? "—" : "Store");
  const itemName = (id?: string) => feedItems.find((i) => i.id === id)?.name ?? "Not in stock list";
  const days = trends.data?.days ?? [];

  const bagSizeOf = (itemId: string): number | null => (analytics.data?.stock.items.find((x) => x.itemId === itemId) as { bagSizeKg?: number | null } | undefined)?.bagSizeKg ?? null;
  return (
    <>
      <PageHeader eyebrow="FeedWise" title="Feed inventory & cost" subtitle="Stock on hand, daily consumption, supplier prices and what feed costs you per bird and per egg." />
      <StatGrid>
        <Stat label="Feed on hand" value={totals ? `${num(totals.quantityKg)} kg` : "—"} badge={totals?.daysRemaining !== null && totals?.daysRemaining !== undefined ? `${totals.daysRemaining} days` : undefined} badgeTone={totals?.daysRemaining !== null && totals?.daysRemaining !== undefined && totals.daysRemaining < 7 ? "amber" : "mint"} hint={totals ? `Using about ${num(totals.averageDailyUseKg, 1)} kg a day` : undefined} />
        <Stat label="Average price" value={totals?.quantityKg ? `${money(totals.valueMinor / totals.quantityKg, currency)} / kg` : "—"} hint={totals ? `${money(totals.valueMinor, currency)} in stock` : undefined} />
        <Stat label="Feed cost per bird" value={birds ? money(feedCost / birds, currency) : "—"} badgeTone="accent" hint="Feed eaten, at what it cost" />
        <Stat label="Feed cost per egg" value={eggs ? money(layerCost / eggs, currency) : "—"} badgeTone="cyan" hint={eggs ? `${num(eggs)} eggs` : "No eggs recorded"} />
      </StatGrid>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        {/* Bag sizes come from each feed (set when it was first bought in bags). */}
        <FormCard
          title="Record a feed purchase"
          allowed={can("inventory.manage")}
          submitLabel="Save purchase"
          fields={[
            { name: "itemId", label: "Feed", type: "select", defaultValue: feedItems[0]?.id ?? "new", options: [...feedItems.map((i) => ({ value: i.id, label: i.name })), { value: "new", label: "+ A new feed" }] },
            { name: "newName", label: "New feed name", required: true, placeholder: "Broiler starter", show: (v) => v["itemId"] === "new" },
            { name: "newStage", label: "Stage", type: "select", defaultValue: "starter", options: FEED_STAGES.map((s) => ({ value: s, label: label(s) })), show: (v) => v["itemId"] === "new" },
            { name: "buyUnit", label: "Bought as", type: "select", defaultValue: "bags", options: [{ value: "bags", label: "Bags" }, { value: "kg", label: "Loose, by kg" }] },
            { name: "bags", label: "Number of bags", type: "number", required: true, min: 0, show: (v) => v["buyUnit"] !== "kg" },
            { name: "bagSizeKg", label: "Bag size (kg)", type: "number", min: 1, defaultValue: 50, show: (v) => v["buyUnit"] !== "kg", hint: "As printed on the bag" },
            { name: "pricePerBag", label: `Price per bag (${currency})`, type: "money", required: true, min: 0, show: (v) => v["buyUnit"] !== "kg" },
            { name: "quantity", label: "Quantity (kg)", type: "number", required: true, min: 0, show: (v) => v["buyUnit"] === "kg" },
            { name: "unitCost", label: `Price per kg (${currency})`, type: "money", required: true, min: 0, show: (v) => v["buyUnit"] === "kg" },
            { name: "supplier", label: "Supplier" },
            { name: "date", label: "Purchase date", type: "date", defaultValue: today, required: true },
            { name: "batchNumber", label: "Batch number" },
            { name: "expiryDate", label: "Use by", type: "date" },
          ]}
          onSubmit={async ({ itemId, newName, newStage, unitCost, buyUnit, bags, bagSizeKg, pricePerBag, quantity, ...rest }) => {
            // Feed is bought and priced per bag: converted here to the kg and price per kg the stock is kept in.
            const inBags = buyUnit !== "kg";
            const size = Number(bagSizeKg ?? 50);
            const kg = inBags ? Number(bags) * size : Number(quantity);
            const perKg = inBags ? Number(pricePerBag) / size : Number(unitCost);
            const id = itemId === "new" || !itemId ? (await createItem.mutateAsync({ name: newName, category: "feed", unit: "kg", feed: { stage: newStage ?? "starter", ...(inBags ? { bagSizeKg: size } : {}) } })).id : String(itemId);
            await purchase.mutateAsync({ _id: id, ...rest, quantity: kg, unitCost: { amountMinor: toMinor(perKg, currency), currency } });
          }}
        />
        <FormCard
          title="Record feed used"
          allowed={can("inventory.issue")}
          description="Feed taken from stock: costed from the batches it came from."
          submitLabel="Save feed use"
          fields={[
            { name: "date", label: "Date", type: "date", defaultValue: today, required: true },
            { name: "kind", label: "Eaten or wasted", type: "select", defaultValue: "consumption", options: [{ value: "consumption", label: "Eaten by a flock" }, { value: "wastage", label: "Wasted or spoiled" }] },
            { name: "flockId", label: "Flock", type: "select", defaultValue: flocks[0]?.id ?? "", options: [{ value: "", label: "In the store (wastage only)" }, ...flocks.map((f) => ({ value: f.id, label: `${f.flockCode} · ${f.name}` }))] },
            { name: "feedItemId", label: "Feed", type: "select", defaultValue: feedItems[0]?.id ?? "", options: [...feedItems.map((i) => ({ value: i.id, label: i.name })), { value: "", label: "Not in the stock list" }] },
            { name: "useUnit", label: "Counted in", type: "select", defaultValue: "bags", options: [{ value: "bags", label: "Bags" }, { value: "kg", label: "kg" }] },
            { name: "quantity", label: "Quantity", type: "number", required: true, min: 0, hint: "Half bags are fine (0.5)" },
            { name: "reason", label: "Reason (for wastage)", show: (v) => v["kind"] === "wastage" },
          ]}
          onSubmit={({ useUnit, quantity, ...v }) => {
            const size = bagSizeOf(String(v["feedItemId"] ?? "")) ?? 50;
            return use.mutateAsync({ ...v, quantityKg: useUnit === "kg" ? Number(quantity) : Number(quantity) * size });
          }}
        />
        <GlassCard>
          <SectionTitle hint="All flocks, eaten">Daily consumption · 14 days</SectionTitle>
          <QueryState query={trends}>{() => <MiniBars values={days.map((d) => d.feedKg)} labels={days.map((d) => d.date)} tone="accent" />}</QueryState>
          <div className="mt-2 flex justify-between text-[11px] text-inksoft"><span>14 days ago</span><span>Today</span></div>
        </GlassCard>
      </div>

      {can("inventory.read") ? (
        <GlassCard className="mb-4">
          <SectionTitle hint="Days left = feed in date ÷ average daily use over the last week">Feed in stock</SectionTitle>
          <QueryState query={analytics}>
            {(x) => (
              <DataTable rows={x.stock.items} rowKey={(r) => r.itemId} empty="No feed in the stock list yet." columns={[
                { key: "name", label: "Feed" },
                { key: "stage", label: "Stage", render: (r) => label(r.stage) },
                { key: "quantityKg", label: "In stock", align: "right", render: (r) => `${num(r.quantityKg)} kg` },
                { key: "expiredKg", label: "Expired", align: "right", render: (r) => (r.expiredKg ? `${num(r.expiredKg)} kg` : "—"), hideOnPhone: true },
                { key: "averageDailyUseKg", label: "Daily use", align: "right", render: (r) => (r.averageDailyUseKg ? `${num(r.averageDailyUseKg, 1)} kg` : "—") },
                { key: "daysRemaining", label: "Days left", align: "right", render: (r) => r.daysRemaining ?? "—" },
                { key: "status", label: "Status", render: (r) => <Badge tone={STATUS_TONE[r.status] ?? "cyan"}>{label(r.status)}</Badge> },
              ]} />
            )}
          </QueryState>
        </GlassCard>
      ) : null}

      <GlassCard className="mb-4">
        <SectionTitle hint="Feed eaten, cost and feed conversion per flock">By flock</SectionTitle>
        <QueryState query={analytics}>
          {(x) => (
            <DataTable rows={x.flocks} rowKey={(r) => r.flockId} empty="No flocks yet." columns={[
              { key: "flockCode", label: "Flock" },
              { key: "feedConsumedKg", label: "Eaten", align: "right", render: (r) => `${num(r.feedConsumedKg)} kg` },
              { key: "feedWastedKg", label: "Wasted", align: "right", render: (r) => `${num(r.feedWastedKg)} kg`, hideOnPhone: true },
              { key: "feedPerBirdKg", label: "Per bird", align: "right", render: (r) => (r.feedPerBirdKg !== null ? `${num(r.feedPerBirdKg, 2)} kg` : "—") },
              { key: "fcr", label: "FCR", align: "right", render: (r) => (r.type === "layer" || r.type === "breeder" ? "eggs" : r.fcr ? <span title={r.fcrWarning ? "Feed records incomplete or FCR implausible: check feed and weights" : undefined} className={r.fcrWarning ? "text-amber-ink" : ""}>{r.fcr.toFixed(2)}{r.fcrWarning ? " ⚠" : ""}</span> : "—") },
              { key: "feedCostPerBirdMinor", label: "Cost / bird", align: "right", render: (r) => money(r.feedCostPerBirdMinor, currency) },
              { key: "feedCostPerEggMinor", label: "Cost / egg", align: "right", render: (r) => (r.eggsCollected ? money(r.feedCostPerEggMinor, currency) : "—") },
            ]} />
          )}
        </QueryState>
      </GlassCard>

      {can("inventory.read") ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassCard>
            <SectionTitle>Purchases & supplier prices</SectionTitle>
            <QueryState query={lots}>
              {(x) => (
                <DataTable rows={x.items} rowKey={(r) => r.id} empty="No feed purchases yet." columns={[
                  { key: "receivedDate", label: "Date", render: (r) => shortDate(r.receivedDate) },
                  { key: "itemName", label: "Feed" },
                  { key: "supplier", label: "Supplier" },
                  { key: "quantityReceived", label: "Quantity", align: "right", render: (r) => `${num(r.quantityReceived)} kg` },
                  { key: "unitCost", label: "Price / kg", align: "right", render: (r) => money(r.unitCost.amountMinor, r.unitCost.currency) },
                  { key: "total", label: "Total", align: "right", render: (r) => money(r.unitCost.amountMinor * r.quantityReceived, r.unitCost.currency), hideOnPhone: true },
                ]} />
              )}
            </QueryState>
          </GlassCard>
          <GlassCard>
            <SectionTitle hint="Last 14 days">Feed use entries</SectionTitle>
            <QueryState query={entries}>
              {(x) => (
                <DataTable rows={x.items} rowKey={(r) => r.id} empty="No feed recorded in the last 14 days." columns={[
                  { key: "date", label: "Date", render: (r) => shortDate(r.date) },
                  { key: "flock", label: "Flock", render: (r) => flockCode(r.flockId) },
                  { key: "kind", label: "Type", render: (r) => (r.kind === "wastage" ? "Wasted" : "Eaten") },
                  { key: "feed", label: "Feed", render: (r) => itemName(r.feedItemId), hideOnPhone: true },
                  { key: "quantityKg", label: "Quantity", align: "right", render: (r) => `${num(r.quantityKg, 1)} kg` },
                ]} actions={can("inventory.issue") ? (r) => (r.dailyRecordId ? <span className="text-[11px] text-inksoft">In daily record</span> : <ConfirmButton onConfirm={() => removeEntry.mutate({ _id: r.id })} />) : undefined} />
              )}
            </QueryState>
          </GlassCard>
        </div>
      ) : null}
    </>
  );
}
