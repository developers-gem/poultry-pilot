import { FULFILMENT_METHODS, LISTING_CATEGORIES, PAYMENT_METHODS, PRICE_UNITS } from "@poultrypilot/constants";
import { useState } from "react";
import { useAuth } from "../api/auth";
import { useFarmInfo } from "../api/farm";
import { useApiQuery, useFarmMutation, useFarmQuery } from "../api/hooks";
import { Form, FormCard } from "../components/forms";
import { EmptyState, QueryState } from "../components/states";
import { DataTable } from "../components/table";
import { Badge, Button, GlassCard, PageHeader, SectionTitle, Stat, StatGrid, Tabs } from "../components/ui";
import { label, money, num, shortDate, toMinor } from "../lib/format";

interface Listing { id: string; title: string; category: string; quantityAvailable: number; unit: string; price: { amountMinor: number; currency: string }; priceUnit: string; regionCode: string; status: string; fulfilmentOptions: string[]; seller?: { name: string; locationLabel: string | null } }
interface Order {
  id: string;
  orderNumber: number;
  channel: string;
  status: string;
  quantity: number;
  lines: { description: string; unit: string }[];
  total: { amountMinor: number; currency: string };
  amountPaid?: { amountMinor: number };
  outstandingMinor: number;
  paymentStatus: string;
  buyerName?: string;
  fulfilment: string;
  nextStatuses: string[];
  createdAt: string;
  sellerContact?: { name: string; email: string; phone?: string } | null;
}
interface Buyer { id: string; name: string; type: string; phone?: string; email?: string; locationLabel?: string }
type Tab = "listings" | "buyers" | "orders" | "placed" | "browse";

const ACT: Record<string, { path: string; label: string }> = { accepted: { path: "accept", label: "Accept" }, preparing: { path: "prepare", label: "Preparing" }, dispatched: { path: "dispatch", label: "Dispatch" }, delivered: { path: "deliver", label: "Delivered" }, completed: { path: "complete", label: "Complete" }, cancelled: { path: "cancel", label: "Cancel" } };

export function MarketPage() {
  const { can, me } = useAuth();
  const { currency, today, farm } = useFarmInfo();
  const [tab, setTab] = useState<Tab>("orders");
  const listings = useFarmQuery<{ items: Listing[] }>("/market/listings");
  const orders = useFarmQuery<{ items: Order[] }>("/market/orders");
  const buyers = useFarmQuery<{ items: Buyer[] }>("/buyers");
  const accounts = useFarmQuery<{ items: { id: string; name: string }[] }>("/finance/accounts", { enabled: can("money.read") });
  const placed = useApiQuery<{ items: Order[] }>("/market/orders", { enabled: tab === "placed" });
  const [category, setCategory] = useState("");
  const browse = useApiQuery<{ items: Listing[] }>(`/market/listings${category ? `?category=${category}` : ""}`, { enabled: tab === "browse" });
  const addListing = useFarmMutation("POST", "/market/listings", { success: "Listing created (draft)" });
  const listingStatus = useFarmMutation<{ _id: string; status: string }>("POST", (b) => `/market/listings/${b._id}/status`, { success: "Listing updated" });
  const addBuyer = useFarmMutation("POST", "/buyers", { success: "Buyer added" });
  const act = useFarmMutation<Record<string, unknown> & { _id: string; _path: string }>("POST", (b) => `/market/orders/${b._id}/${b._path}`, { success: "Order updated" });
  const pay = useFarmMutation<Record<string, unknown> & { _id: string }>("POST", (b) => `/market/orders/${b._id}/payments`, { success: "Payment recorded" });
  const placeOrder = useFarmMutation("POST", "/market/orders", { success: "Order placed", root: true });
  const buyerAct = useFarmMutation<{ _id: string; _path: string; reason?: string }>("POST", (b) => `/market/orders/${b._id}/${b._path}`, { success: "Order updated", root: true });
  const [open, setOpen] = useState<{ id: string; what: string } | null>(null);
  const all = orders.data?.items ?? [];
  const openOrders = all.filter((o) => !["completed", "cancelled"].includes(o.status));
  const billed = all.filter((o) => o.status !== "cancelled").reduce((t, o) => t + o.total.amountMinor, 0);
  const received = all.reduce((t, o) => t + (o.amountPaid?.amountMinor ?? 0), 0);
  const owed = all.filter((o) => o.status !== "cancelled").reduce((t, o) => t + o.outstandingMinor, 0);
  const m = (x: number) => money(x, currency);
  const toggle = (id: string, what: string) => setOpen(open?.id === id && open.what === what ? null : { id, what });

  return (
    <>
      <PageHeader eyebrow="PoultryMarketConnect" title="Sell birds, eggs & chicks" subtitle="Your listings, your buyer contact book, and every order with what has been paid and what is still owed." />
      <StatGrid>
        <Stat label="Open orders" value={num(openOrders.length)} badgeTone="cyan" hint={`${num(all.length)} orders in total`} />
        <Stat label="Order value" value={m(billed)} hint={`${num(listings.data?.items.length)} listings posted`} />
        <Stat label="Payments received" value={m(received)} badgeTone="mint" />
        <Stat label="Still owed" value={m(owed)} badgeTone={owed ? "amber" : "mint"} badge={owed ? "Follow up" : "All paid"} />
      </StatGrid>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: "orders", label: "Orders received", count: openOrders.length }, { id: "listings", label: "Your listings" }, { id: "buyers", label: "Buyers" }, { id: "placed", label: "Orders you placed" }, { id: "browse", label: "Browse the market" }]} />

      {tab === "listings" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <FormCard title="Post a listing" defaultOpen allowed={can("market.manage")} submitLabel="Create listing" description="Listings start as drafts; publish when ready. Buyers never see your phone or email until you accept their order."
              fields={[
                { name: "title", label: "Title", required: true, placeholder: "Brown eggs, large" },
                { name: "category", label: "Category", type: "select", defaultValue: "eggs", options: LISTING_CATEGORIES.map((c) => ({ value: c, label: label(c) })) },
                { name: "quantityAvailable", label: "Quantity available", type: "number", required: true, min: 0 },
                { name: "unit", label: "Unit", required: true, placeholder: "tray, bird, kg" },
                { name: "price", label: `Price per unit (${currency})`, type: "money", required: true, min: 0 },
                { name: "priceUnit", label: "Price basis", type: "select", defaultValue: "per_tray", options: PRICE_UNITS.map((p) => ({ value: p, label: label(p) })) },
                { name: "regionCode", label: "Region", required: true, defaultValue: farm?.countryCode ?? "", placeholder: "IN or IN-UP", hint: "Country code, optionally with your state" },
                { name: "pickup", label: "Buyer collects", type: "checkbox", defaultValue: true },
                { name: "seller_delivery", label: "We deliver", type: "checkbox" },
                { name: "courier", label: "Courier", type: "checkbox" },
              ]}
              errorMap={{ fulfilmentOptions: "pickup" }}
              onSubmit={({ price, pickup, seller_delivery, courier, ...rest }) => addListing.mutateAsync({ ...rest, price: { amountMinor: toMinor(Number(price), currency), currency }, fulfilmentOptions: FULFILMENT_METHODS.filter((f) => ({ pickup, seller_delivery, courier })[f]) })} />
          </div>
          <GlassCard className="lg:col-span-2">
            <SectionTitle>Your listings</SectionTitle>
            <QueryState query={listings}>
              {(x) => (
                <DataTable rows={x.items} rowKey={(r) => r.id} empty="No listings yet." columns={[
                  { key: "title", label: "Listing" },
                  { key: "category", label: "Category", render: (r) => label(r.category) },
                  { key: "quantityAvailable", label: "Available", align: "right", render: (r) => `${num(r.quantityAvailable)} ${r.unit}` },
                  { key: "price", label: "Price", align: "right", render: (r) => money(r.price.amountMinor, r.price.currency) },
                  { key: "status", label: "Status", render: (r) => <Badge tone={r.status === "active" ? "mint" : r.status === "sold_out" ? "amber" : "cyan"}>{label(r.status)}</Badge> },
                ]} actions={can("market.manage") ? (r) => (
                  <span className="flex justify-end gap-3 text-[12px] font-medium">
                    {r.status === "draft" || r.status === "paused" ? <button type="button" className="text-mint-ink hover:underline" onClick={() => listingStatus.mutate({ _id: r.id, status: "active" })}>Publish</button> : null}
                    {r.status === "active" ? <button type="button" className="text-inksoft hover:underline" onClick={() => listingStatus.mutate({ _id: r.id, status: "paused" })}>Pause</button> : null}
                    {r.status !== "closed" ? <button type="button" className="text-rose-ink hover:underline" onClick={() => listingStatus.mutate({ _id: r.id, status: "closed" })}>Close</button> : null}
                  </span>
                ) : undefined} />
              )}
            </QueryState>
          </GlassCard>
        </div>
      ) : null}

      {tab === "buyers" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <FormCard title="Add a buyer" defaultOpen allowed={can("market.manage")} submitLabel="Add buyer" fields={[
            { name: "name", label: "Name", required: true },
            { name: "type", label: "Type", type: "select", defaultValue: "trader", options: ["trader", "retailer", "restaurant", "processor", "individual", "farm", "other"].map((t) => ({ value: t, label: label(t) })) },
            { name: "phone", label: "Phone" },
            { name: "email", label: "Email", type: "email" },
            { name: "locationLabel", label: "Location" },
          ]} onSubmit={(v) => addBuyer.mutateAsync(v)} />
          <GlassCard className="lg:col-span-2">
            <SectionTitle>Your buyers</SectionTitle>
            <QueryState query={buyers}>
              {(x) => <DataTable rows={x.items} rowKey={(r) => r.id} empty="No buyers yet." columns={[{ key: "name", label: "Buyer" }, { key: "type", label: "Type", render: (r) => label(r.type) }, { key: "phone", label: "Phone" }, { key: "locationLabel", label: "Location", hideOnPhone: true }]} />}
            </QueryState>
          </GlassCard>
        </div>
      ) : null}

      {tab === "orders" ? (
        <GlassCard>
          <SectionTitle hint="Marketplace orders and chick orders; buttons follow each order's next allowed steps">Orders you received</SectionTitle>
          <QueryState query={orders} isEmpty={(x) => !x.items.length} empty={<EmptyState title="No orders yet." body="Publish a listing, or record chick orders on Hatchery." />}>
            {(x) => (
              <div className="space-y-2">
                {x.items.map((o) => (
                  <div key={o.id} className="panel-inner rounded-xl p-3 text-[13px]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">#{o.orderNumber} · {o.buyerName ?? "Buyer"} · {num(o.quantity)} {o.lines[0]?.unit}</p>
                        <p className="text-[12px] text-inksoft">{o.lines[0]?.description} · {shortDate(o.createdAt.slice(0, 10))} · {label(o.fulfilment)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={o.status === "completed" ? "mint" : o.status === "cancelled" ? "rose" : "cyan"}>{label(o.status)}</Badge>
                        <Badge tone={o.paymentStatus === "paid" ? "mint" : "amber"}>{m(o.total.amountMinor)} · {label(o.paymentStatus)}</Badge>
                      </div>
                    </div>
                    {can("market.manage") ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(o.nextStatuses ?? []).map((s) => (s === "dispatched" || s === "cancelled" || s === "delivered" ? (
                          <Button key={s} variant={s === "cancelled" ? "danger" : "glass"} className="!px-3 !py-1.5" onClick={() => toggle(o.id, s)}>{ACT[s]?.label}</Button>
                        ) : (
                          <Button key={s} variant="glass" className="!px-3 !py-1.5" onClick={() => act.mutate({ _id: o.id, _path: ACT[s]!.path })}>{ACT[s]?.label}</Button>
                        )))}
                        {o.outstandingMinor > 0 && o.status !== "pending" && o.status !== "cancelled" && can("payment.record") ? <Button variant="glass" className="!px-3 !py-1.5" onClick={() => toggle(o.id, "pay")}>Record payment</Button> : null}
                      </div>
                    ) : null}
                    {open?.id === o.id ? (
                      <div className="mt-3 border-t border-white/60 pt-3">
                        {open.what === "dispatched" ? <Form submitLabel="Dispatch" fields={[{ name: "vehicle", label: "Vehicle" }, { name: "driver", label: "Driver" }, { name: "expectedDate", label: "Expected delivery", type: "date", defaultValue: today }]} onSubmit={async (v) => { await act.mutateAsync({ _id: o.id, _path: "dispatch", ...v }); setOpen(null); }} /> : null}
                        {open.what === "delivered" ? <Form submitLabel="Mark delivered" fields={[{ name: "date", label: "Delivered on", type: "date", defaultValue: today }, { name: "receivedBy", label: "Received by" }]} onSubmit={async (v) => { await act.mutateAsync({ _id: o.id, _path: "deliver", ...v }); setOpen(null); }} /> : null}
                        {open.what === "cancelled" ? <Form columns={1} submitLabel="Cancel order" fields={[{ name: "reason", label: "Reason", required: true }]} onSubmit={async (v) => { await act.mutateAsync({ _id: o.id, _path: "cancel", ...v }); setOpen(null); }} /> : null}
                        {open.what === "pay" ? (
                          accounts.data?.items.length ? (
                            <Form submitLabel="Record payment" fields={[{ name: "amount", label: `Amount (${currency})`, type: "money", required: true, defaultValue: o.outstandingMinor / 100 }, { name: "accountId", label: "Into account", type: "select", defaultValue: accounts.data.items[0]!.id, options: accounts.data.items.map((a) => ({ value: a.id, label: a.name })) }, { name: "method", label: "How", type: "select", defaultValue: "cash", options: PAYMENT_METHODS.map((x) => ({ value: x, label: label(x) })) }, { name: "date", label: "Date", type: "date", defaultValue: today }, { name: "reference", label: "Reference" }]}
                              onSubmit={async ({ amount, ...rest }) => { await pay.mutateAsync({ _id: o.id, ...rest, amount: { amountMinor: toMinor(Number(amount), currency), currency } }); setOpen(null); }} />
                          ) : <p className="text-[13px] text-inksoft">Add a cash or bank account on the Money page first.</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </QueryState>
        </GlassCard>
      ) : null}

      {tab === "placed" ? (
        <GlassCard>
          <SectionTitle hint="Orders you placed with other farms">Orders you placed</SectionTitle>
          <QueryState query={placed} isEmpty={(x) => !x.items.length} empty={<EmptyState title="You haven't ordered from other farms." body="Browse the market to find birds, eggs and chicks." />}>
            {(x) => (
              <DataTable rows={x.items} rowKey={(r) => r.id} columns={[
                { key: "orderNumber", label: "Order", render: (r) => `#${r.orderNumber}` },
                { key: "item", label: "Item", render: (r) => r.lines[0]?.description },
                { key: "quantity", label: "Quantity", align: "right", render: (r) => `${num(r.quantity)} ${r.lines[0]?.unit ?? ""}` },
                { key: "total", label: "Total", align: "right", render: (r) => money(r.total.amountMinor, r.total.currency) },
                { key: "status", label: "Status", render: (r) => label(r.status) },
                { key: "seller", label: "Seller contact", render: (r) => (r.sellerContact ? `${r.sellerContact.name} · ${r.sellerContact.phone ?? r.sellerContact.email}` : "Shown once accepted") },
              ]} actions={(r) => (
                <span className="flex justify-end gap-3 text-[12px] font-medium">
                  {(r.nextStatuses ?? []).includes("cancelled") && (r.status === "pending" || r.status === "accepted") ? <button type="button" className="text-rose-ink hover:underline" onClick={() => buyerAct.mutate({ _id: r.id, _path: "cancel", reason: "Cancelled by buyer" })}>Cancel</button> : null}
                  {r.status === "dispatched" ? <button type="button" className="text-mint-ink hover:underline" onClick={() => buyerAct.mutate({ _id: r.id, _path: "received" })}>Received</button> : null}
                </span>
              )} />
            )}
          </QueryState>
        </GlassCard>
      ) : null}

      {tab === "browse" ? (
        <GlassCard>
          <SectionTitle hint="Listings from other farms. Prices are set by each seller." action={<select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className="panel-inner rounded-xl px-3 py-1.5 text-[13px]"><option value="">All categories</option>{LISTING_CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}</select>}>Browse the market</SectionTitle>
          <QueryState query={browse} isEmpty={(x) => !x.items.length} empty={<EmptyState title="No listings right now." />}>
            {(x) => (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {x.items.map((l) => (
                  <div key={l.id} className="panel-inner rounded-xl p-4">
                    <p className="font-display text-[16px] font-semibold">{l.title}</p>
                    <p className="text-[12px] text-inksoft">{l.seller?.name}{l.seller?.locationLabel ? ` · ${l.seller.locationLabel}` : ""} · {l.regionCode}</p>
                    <p className="mt-2 text-[13px]"><span className="font-semibold">{money(l.price.amountMinor, l.price.currency)}</span> per {l.unit} · {num(l.quantityAvailable)} available</p>
                    <Button variant="glass" className="mt-3 !px-3 !py-1.5" onClick={() => toggle(l.id, "order")}>Order</Button>
                    {open?.id === l.id ? (
                      <div className="mt-3 border-t border-white/60 pt-3">
                        <Form columns={1} submitLabel="Place order" fields={[
                          { name: "quantity", label: `Quantity (${l.unit})`, type: "number", required: true, min: 1, max: l.quantityAvailable },
                          { name: "fulfilment", label: "Delivery", type: "select", defaultValue: l.fulfilmentOptions[0] ?? "pickup", options: l.fulfilmentOptions.map((f) => ({ value: f, label: label(f) })) },
                          { name: "deliveryAddress", label: "Delivery address", show: (v) => v["fulfilment"] !== "pickup" },
                          { name: "buyerPhone", label: "Your phone", defaultValue: me?.user.phone ?? "" },
                        ]} onSubmit={async (v) => { await placeOrder.mutateAsync({ ...v, listingId: l.id, buyerName: me?.user.fullName ?? "Buyer" }); setOpen(null); setTab("placed"); }} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </QueryState>
        </GlassCard>
      ) : null}
    </>
  );
}
