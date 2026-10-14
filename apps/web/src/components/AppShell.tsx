import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../api/auth";
import { useFarmQuery } from "../api/hooks";
import { OfflineBanner } from "./states";
import { Backdrop, Logo } from "./ui";

type NavItem = { to: string; label: string };
type NavGroup = NavItem & { items?: NavItem[] };

/** The prototype's navigation, unchanged in grouping and naming. */
export const GROUPS: NavGroup[] = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/flocks", label: "Flocks", items: [{ to: "/lifecycle", label: "Lifecycle" }, { to: "/weights", label: "Weights" }, { to: "/chicks", label: "ChickStart" }, { to: "/hatchery", label: "Hatchery" }] },
  { to: "/eggs", label: "Production", items: [{ to: "/feed", label: "FeedWise" }] },
  { to: "/health", label: "Health", items: [{ to: "/biosecurity", label: "BioSecure" }, { to: "/calendar", label: "Calendar" }, { to: "/weather", label: "Weather" }] },
  { to: "/money", label: "Money", items: [{ to: "/expenses", label: "Running Costs" }] },
  { to: "/market", label: "Market" },
  { to: "/training", label: "Learn", items: [{ to: "/facts", label: "Facts" }, { to: "/news", label: "News" }, { to: "/glossary", label: "Glossary" }] },
  { to: "/farm-profile", label: "Farm" },
];

const isOn = (pathname: string, to: string) => pathname === to || pathname.startsWith(`${to}/`);
const groupActive = (pathname: string, g: NavGroup) => isOn(pathname, g.to) || !!g.items?.some((i) => isOn(pathname, i.to));

function AlertsPill() {
  const alerts = useFarmQuery<{ counts: { open: number } }>("/alerts?status=open&limit=1", { refetchInterval: 60_000 });
  const n = alerts.data?.counts.open;
  return (
    <Link to="/alerts" className="prism-glass flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1.5 sm:px-3" aria-label={n === undefined ? "Alerts" : `${n} open alerts`}>
      <span className="hidden text-[11px] text-inksoft min-[420px]:inline">Alerts</span>
      <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${n ? "bg-rose/15 text-rose-ink" : "bg-mint/15 text-mint-ink"}`}>{n ?? "·"}</span>
    </Link>
  );
}

function FarmSwitcher() {
  const { me, farm, selectFarm } = useAuth();
  if (!me || me.memberships.length < 2) return null;
  return (
    <label className="hidden items-center gap-2 text-[12px] md:flex">
      <span className="sr-only">Farm</span>
      <select value={farm?.farmId} onChange={(e) => selectFarm(e.target.value)} className="panel-inner max-w-[12rem] rounded-xl px-2.5 py-1.5 text-[12px]">
        {me.memberships.map((m) => (
          <option key={m.farmId} value={m.farmId}>
            {m.farmName}
          </option>
        ))}
      </select>
    </label>
  );
}

function DesktopNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="hidden items-center gap-1 text-[13px] font-medium lg:flex">
      {GROUPS.map((g) => {
        const active = groupActive(pathname, g);
        const has = !!g.items?.length;
        return (
          <div key={g.to} className="relative" onMouseEnter={() => has && setOpen(g.to)} onMouseLeave={() => setOpen(null)} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(null)}>
            <div className="flex items-center">
              <Link to={g.to} aria-current={isOn(pathname, g.to) ? "page" : undefined} className={`flex items-center gap-1 rounded-xl px-3.5 py-2 transition-colors ${active ? "bg-ink text-white" : "text-inksoft hover:bg-white/60"}`}>
                {g.label}
                {has ? (
                  <svg aria-hidden className="size-3.5 opacity-70" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" /></svg>
                ) : null}
              </Link>
              {has ? (
                <button type="button" className="sr-only focus:not-sr-only focus:ml-1 focus:rounded-lg focus:px-1 focus:text-[11px]" aria-expanded={open === g.to} onClick={() => setOpen(open === g.to ? null : g.to)}>
                  {g.label} menu
                </button>
              ) : null}
            </div>
            {has && open === g.to ? (
              <div className="absolute top-full left-0 z-40 pt-2">
                <div className="prism-edge min-w-[10rem] rounded-xl bg-white/95 p-1.5 shadow-xl backdrop-blur-xl">
                  {g.items!.map((i) => (
                    <Link key={i.to} to={i.to} onClick={() => setOpen(null)} aria-current={isOn(pathname, i.to) ? "page" : undefined} className={`block rounded-lg px-3 py-2 text-[13px] ${isOn(pathname, i.to) ? "bg-brand/10 text-brand-ink" : "text-inksoft hover:bg-white/60"}`}>
                      {i.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Phones and tablets: a grouped menu instead of the prototype's long strip of 21 links. */
function MobileNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const { me, farm, selectFarm } = useAuth();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLElement>("a")?.focus();
  }, [open]);
  return (
    <div className="lg:hidden">
      <button type="button" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)} className="rounded-xl px-2.5 py-1.5 text-[12px] font-semibold text-ink hover:bg-white/60">
        {open ? "Close" : "Menu"}
      </button>
      {open
        ? createPortal(
            // Portalled to <body>: the header's backdrop-filter would otherwise trap these fixed layers inside it.
            <>
              <div aria-hidden className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
              <div id="mobile-nav" ref={panel} role="dialog" aria-modal="true" aria-label="Menu" className="prism-edge fixed inset-x-3 top-3 z-50 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl bg-white/97 p-3 shadow-2xl sm:inset-x-6" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="font-display text-[15px] font-semibold">Menu</span>
                  <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-3 py-1.5 text-[12px] font-semibold hover:bg-black/5">Close</button>
                </div>
                {me && me.memberships.length > 1 ? (
                  <label className="mb-3 block text-[11px] tracking-[0.15em] text-inksoft uppercase">
                    Farm
                    <select value={farm?.farmId} onChange={(e) => selectFarm(e.target.value)} className="panel-inner mt-1 w-full rounded-xl px-3 py-2 text-[14px] tracking-normal normal-case">
                      {me.memberships.map((m) => (
                        <option key={m.farmId} value={m.farmId}>{m.farmName}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <nav aria-label="Main" className="grid gap-3 sm:grid-cols-2">
                  {GROUPS.map((g) => (
                    <div key={g.to}>
                      <Link to={g.to} className={`block rounded-lg px-3 py-2 text-[14px] font-semibold ${isOn(pathname, g.to) ? "bg-ink text-white" : "text-ink hover:bg-black/5"}`}>
                        {g.label}
                      </Link>
                      {g.items?.map((i) => (
                        <Link key={i.to} to={i.to} className={`ml-3 block rounded-lg px-3 py-1.5 text-[13px] ${isOn(pathname, i.to) ? "bg-brand/10 text-brand-ink" : "text-inksoft hover:bg-black/5"}`}>
                          {i.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                </nav>
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}

export function AppShell() {
  const { pathname } = useLocation();
  const { farm, logout } = useAuth();
  return (
    <div className="relative min-h-screen w-full bg-background font-body text-ink">
      <Backdrop />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="relative z-30 px-4 pt-4 sm:px-6 sm:pt-6 lg:px-10">
        <nav aria-label="Main" className="prism-glass prism-edge relative flex items-center justify-between gap-3 rounded-2xl px-4 py-3 sm:px-5">
          <Link to="/dashboard" aria-label="PoultryPilot dashboard" className="min-w-0">
            <Logo subtitle={farm?.farmName ?? "Flock OS"} />
          </Link>
          <DesktopNav pathname={pathname} />
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <FarmSwitcher />
            <AlertsPill />
            <button type="button" onClick={() => void logout()} className="hidden rounded-xl px-3 py-1.5 text-[12px] font-medium text-inksoft hover:bg-white/60 sm:block">
              Sign out
            </button>
            <MobileNav pathname={pathname} />
          </div>
        </nav>
      </header>
      <main id="main" className="relative z-10 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <OfflineBanner />
        <Outlet />
        <button type="button" onClick={() => void logout()} className="mt-10 rounded-xl px-3 py-1.5 text-[12px] font-medium text-inksoft hover:bg-white/60 sm:hidden">
          Sign out
        </button>
      </main>
    </div>
  );
}
