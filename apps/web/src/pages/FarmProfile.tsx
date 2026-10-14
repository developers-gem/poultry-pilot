import { useState } from "react";
import { useAuth } from "../api/auth";
import { authedRequest } from "../api/client";
import { useFarmInfo, useFlocks } from "../api/farm";
import { useFarmMutation, useFarmQuery } from "../api/hooks";
import { Form } from "../components/forms";
import { QueryState } from "../components/states";
import { toast } from "../components/toast";
import { Button, GlassCard, PageHeader, Stat, StatGrid } from "../components/ui";
import { num, pct } from "../lib/format";
import { CURRENCIES } from "./Auth";

export function FarmProfilePage() {
  const { can, me, reload } = useAuth();
  const { query, farm } = useFarmInfo();
  const flocks = useFlocks("active").data?.items ?? [];
  const houses = useFarmQuery<{ items: unknown[] }>("/houses");
  const save = useFarmMutation<Record<string, unknown>>("PUT", "", { success: "Farm details saved" });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const loc = coords ?? farm?.location ?? null;
  const fields = farm ? [farm.name, farm.description, farm.countryCode, farm.locationLabel, farm.location, me?.user.phone] : [];
  const complete = fields.length ? (fields.filter(Boolean).length / fields.length) * 100 : 0;

  return (
    <>
      <PageHeader eyebrow="Farm identity" title={farm?.name ?? "Your farm"} subtitle="Where buyers and your own records see who you are: location, contact and how the farm keeps its numbers." />
      <StatGrid>
        <Stat label="Active birds" value={num(flocks.reduce((t, f) => t + (f.currentBirdCount ?? 0), 0))} badge={`${flocks.length} flocks`} badgeTone="mint" />
        <Stat label="Houses" value={num(houses.data?.items.length)} badge="on record" badgeTone="cyan" />
        <Stat label="Profile completeness" value={pct(complete, 0)} badgeTone={complete >= 80 ? "mint" : "amber"} hint={farm?.location ? "Location set: weather is on" : "Add the location to turn on weather"} />
        <Stat label="Your role" value={farm?.myRole ? farm.myRole.replace("_", " ") : "—"} badgeTone="accent" />
      </StatGrid>
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <h2 className="mb-4 font-display text-[16px] font-semibold tracking-tight">Farm details</h2>
          <QueryState query={query}>
            {(f) => !can("farm.update_settings") ? (
              <dl className="grid gap-3 text-[13px] sm:grid-cols-2">
                {[["Name", f.name], ["Location", f.locationLabel], ["Country", f.countryCode], ["Currency", f.settings.currency], ["Time zone", f.settings.timezone], ["About", f.description]].map(([k, v]) => <div key={k}><dt className="text-[11px] tracking-[0.15em] text-inksoft uppercase">{k}</dt><dd>{v || "—"}</dd></div>)}
              </dl>
            ) : (
              <Form
                key={`${f.version}:${loc?.lat ?? ""}`}
                submitLabel="Save farm details"
                resetOnSuccess={false}
                initial={{ name: f.name, description: f.description ?? "", countryCode: f.countryCode ?? "", locationLabel: f.locationLabel ?? "", lat: loc?.lat ?? "", lng: loc?.lng ?? "", currency: f.settings.currency, timezone: f.settings.timezone, visitorDowntimeHours: f.settings.visitorDowntimeHours ?? "" } as never}
                fields={[
                  { name: "name", label: "Farm name", required: true },
                  { name: "locationLabel", label: "Location", placeholder: "Town, district" },
                  { name: "countryCode", label: "Country code", placeholder: "IN", hint: "Two letters; used for news, prices and content for your country" },
                  { name: "lat", label: "Latitude", type: "number", step: "any", min: -90, max: 90 },
                  { name: "lng", label: "Longitude", type: "number", step: "any", min: -180, max: 180, hint: "Needed for weather" },
                  { name: "currency", label: "Currency", type: "select", options: [...new Set([f.settings.currency, ...CURRENCIES])].map((c) => ({ value: c, label: c })), hint: "Can change only before money is recorded" },
                  { name: "timezone", label: "Time zone", required: true },
                  { name: "visitorDowntimeHours", label: "Visitor downtime rule (hours)", type: "number", min: 0, hint: "Flag visitors who were near other poultry more recently" },
                  { name: "description", label: "About the farm", type: "textarea", span: true },
                ]}
                errorMap={{ location: "lat", "location.lat": "lat", "location.lng": "lng" }}
                footer={<Button variant="glass" onClick={() => navigator.geolocation ? navigator.geolocation.getCurrentPosition((p) => setCoords({ lat: Math.round(p.coords.latitude * 1e5) / 1e5, lng: Math.round(p.coords.longitude * 1e5) / 1e5 }), () => toast.error("Location permission was refused.")) : toast.error("This device can't share its location.")}>Use my location</Button>}
                onSubmit={async ({ lat, lng, countryCode, visitorDowntimeHours, ...rest }) => {
                  await save.mutateAsync({
                    ...rest,
                    ...(countryCode ? { countryCode: String(countryCode).toUpperCase() } : {}),
                    ...(lat !== undefined && lng !== undefined ? { location: { lat, lng } } : {}),
                    ...(visitorDowntimeHours !== undefined ? { visitorDowntimeHours } : {}),
                    unitSystem: f.settings.unitSystem,
                    fcrIncludesMortalityWeight: (f.settings as { fcrIncludesMortalityWeight?: boolean }).fcrIncludesMortalityWeight ?? false,
                    workerEditWindowDays: f.settings.workerEditWindowDays,
                    version: f.version,
                  });
                  await reload();
                }}
              />
            )}
          </QueryState>
        </GlassCard>
        <GlassCard>
          <h2 className="mb-4 font-display text-[16px] font-semibold tracking-tight">You</h2>
          {me ? (
            <Form
              columns={1}
              resetOnSuccess={false}
              submitLabel="Save my details"
              initial={{ fullName: me.user.fullName, phone: me.user.phone ?? "" }}
              fields={[
                { name: "fullName", label: "Your name", required: true },
                { name: "phone", label: "Phone", placeholder: "+91 98765 43210", hint: "Shared with buyers only after you accept their order" },
              ]}
              onSubmit={async (v) => {
                await authedRequest("/me", { method: "PUT", body: JSON.stringify(v) });
                await reload();
                toast.success("Your details are saved");
              }}
            />
          ) : null}
          <p className="mt-4 text-[12px] text-inksoft">Signed in as {me?.user.email}</p>
        </GlassCard>
      </div>
    </>
  );
}
