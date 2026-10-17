import { Link } from "@tanstack/react-router";
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";

/** The soft colour blobs behind every page (prototype AppShell). */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -top-40 -left-32 size-[520px] rounded-full bg-brand/25 blur-[120px]" />
      <div className="absolute top-24 -right-40 size-[560px] rounded-full bg-accent/20 blur-[130px]" />
      <div className="absolute bottom-0 left-1/3 size-[480px] rounded-full bg-cyan/20 blur-[120px]" />
      <div className="absolute right-10 bottom-10 size-[360px] rounded-full bg-mint/20 blur-[110px]" />
    </div>
  );
}

export function Logo({ subtitle }: { subtitle: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5 sm:gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand font-display text-base font-bold text-white shadow-sm">PP</span>
      <span className="min-w-0">
        <span className="block font-display text-[15px] leading-none font-semibold tracking-tight whitespace-nowrap">Poultry&nbsp;Pilot</span>
        <span className="mt-0.5 block max-w-[7.5rem] truncate text-[10px] tracking-[0.18em] text-inksoft uppercase sm:max-w-[11rem]">{subtitle}</span>
      </span>
    </span>
  );
}

export function GlassCard({ children, className = "", as: As = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <As className={`prism-glass prism-edge rounded-2xl p-5 ${className}`}>{children}</As>;
}

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="mb-1 text-[12px] tracking-[0.2em] text-inksoft uppercase">{eyebrow}</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1.5 max-w-3xl text-[14px] text-inksoft">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export type Tone = "mint" | "rose" | "amber" | "accent" | "cyan" | "brand";
const TONES: Record<Tone, string> = {
  mint: "text-mint-ink bg-mint/15",
  rose: "text-rose-ink bg-rose/15",
  amber: "text-amber-ink bg-amber/15",
  accent: "text-accent bg-accent/15",
  cyan: "text-cyan-ink bg-cyan/15",
  brand: "text-brand-ink bg-brand/12",
};

export function Badge({ children, tone = "mint" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${TONES[tone]}`}>{children}</span>;
}

export function Stat({ label, value, badge, badgeTone = "mint", hint, children }: { label: string; value: ReactNode; badge?: ReactNode; badgeTone?: Tone; hint?: ReactNode; children?: ReactNode }) {
  return (
    <GlassCard>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-inksoft">{label}</p>
        {badge !== undefined && badge !== null ? <Badge tone={badgeTone}>{badge}</Badge> : null}
      </div>
      <p className="mt-3 font-display text-[26px] font-semibold tracking-tight break-words sm:text-[28px]">{value}</p>
      {hint ? <p className="mt-3 text-[12px] text-inksoft">{hint}</p> : null}
      {children}
    </GlassCard>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="mb-4 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

const BARS: Record<string, [string, string]> = {
  brand: ["bg-brand", "bg-brand/50"],
  cyan: ["bg-cyan", "bg-cyan/60"],
  accent: ["bg-accent", "bg-accent/40"],
  rose: ["bg-rose", "bg-rose/40"],
  mint: ["bg-mint", "bg-mint/50"],
  amber: ["bg-amber", "bg-amber/50"],
};

/** Small bar chart; the last bar is highlighted. `labels` are read out for screen readers. */
export function MiniBars({ values, tone = "brand", height = "h-24", labels }: { values: number[]; tone?: keyof typeof BARS; height?: string; labels?: string[] }) {
  const max = Math.max(1, ...values);
  const [strong, soft] = BARS[tone] ?? BARS["brand"]!;
  return (
    <div className={`flex items-end gap-1.5 ${height}`} role="img" aria-label={labels ? values.map((v, i) => `${labels[i]}: ${v}`).join(", ") : `Values: ${values.join(", ")}`}>
      {values.map((v, i) => (
        <span key={i} title={labels?.[i] ? `${labels[i]}: ${v}` : String(v)} className={`flex-1 rounded-t-md ${i === values.length - 1 ? strong : soft}`} style={{ height: `${Math.max(4, (v / max) * 100)}%` }} />
      ))}
    </div>
  );
}

export function SectionTitle({ children, action, hint }: { children: ReactNode; action?: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="font-display text-[16px] font-semibold tracking-tight">{children}</h2>
        {hint ? <p className="text-[12px] text-inksoft">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

type Variant = "primary" | "glass" | "ghost" | "danger";
const BUTTON: Record<Variant, string> = {
  primary: "bg-ink text-white font-semibold hover:bg-ink/90",
  glass: "prism-glass font-medium hover:bg-white/70",
  ghost: "text-inksoft font-medium hover:bg-white/60",
  danger: "text-rose-ink font-medium hover:bg-rose/10",
};

export function Button({ variant = "primary", className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" {...rest} className={`rounded-xl px-4 py-2.5 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${BUTTON[variant]} ${className}`} />;
}

export function LinkButton({ to, variant = "primary", children, search }: { to: string; variant?: Variant; children: ReactNode; search?: Record<string, string> }) {
  return (
    <Link to={to} {...(search ? { search } : {})} className={`inline-block rounded-xl px-4 py-2.5 text-[13px] transition-colors ${BUTTON[variant]}`}>
      {children}
    </Link>
  );
}

/** Two-step delete: the first click asks, the second does it. */
export function ConfirmButton({ onConfirm, children = "Remove", confirmText = "Confirm", disabled }: { onConfirm: () => void; children?: ReactNode; confirmText?: string; disabled?: boolean }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" disabled={disabled} onClick={() => setAsking(true)} className="text-[12px] font-medium text-rose-ink hover:underline disabled:opacity-50">
        {children}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-[12px]">
      <button type="button" onClick={() => { setAsking(false); onConfirm(); }} className="rounded-lg bg-rose/15 px-2 py-1 font-semibold text-rose-ink">
        {confirmText}
      </button>
      <button type="button" onClick={() => setAsking(false)} className="text-inksoft hover:underline">
        Cancel
      </button>
    </span>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div role="tablist" className="prism-glass mb-4 flex gap-1 overflow-x-auto rounded-2xl p-1.5">
      {tabs.map((t) => (
        <button key={t.id} role="tab" type="button" aria-selected={value === t.id} onClick={() => onChange(t.id)} className={`shrink-0 rounded-xl px-3.5 py-2 text-[13px] font-medium ${value === t.id ? "bg-ink text-white" : "text-inksoft hover:bg-white/60"}`}>
          {t.label}
          {t.count !== undefined ? <span className="ml-1.5 opacity-70">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({ value, tone = "brand", label }: { value: number; tone?: "brand" | "mint" | "rose" | "amber"; label: string }) {
  const c = { brand: "bg-brand", mint: "bg-mint", rose: "bg-rose", amber: "bg-amber" }[tone];
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-black/5" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${c}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
