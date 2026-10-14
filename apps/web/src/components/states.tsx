import type { UseQueryResult } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError } from "../api/client";
import { Button, GlassCard } from "./ui";

export function useOnline(): boolean {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

/** Shown across the top while offline: pages keep showing what was last loaded; saving waits for a connection. */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="prism-glass mb-4 rounded-2xl border-amber/40 px-4 py-3 text-[13px]">
      <span className="font-semibold text-amber-ink">You're offline.</span> <span className="text-inksoft">You're seeing the last data loaded. Saving is paused until you reconnect.</span>
    </div>
  );
}

export function LoadingState({ rows = 3, label = "Loading…" }: { rows?: number; label?: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="panel-inner h-12 animate-pulse rounded-xl" />
      ))}
    </div>
  );
}

/** Skeleton for a page's stat row while the first data loads. */
export function StatSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-busy="true" className="mb-4 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="prism-glass h-[124px] animate-pulse rounded-2xl" />
      ))}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="py-8 text-center">
      <p className="text-[14px] font-medium">{title}</p>
      {body ? <p className="mx-auto mt-1 max-w-md text-[13px] text-inksoft">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === "FORBIDDEN") return "Your role on this farm doesn't include this.";
    if (e.code === "OFFLINE") return e.message; // "You're offline … nothing was saved": says what to do
    if (e.code === "NETWORK_ERROR") return "Can't reach PoultryPilot. Check your connection; nothing was saved.";
    return e.message;
  }
  return e instanceof Error ? e.message : "Something went wrong.";
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const e = error instanceof ApiError ? error : null;
  return (
    <div role="alert" className="rounded-xl border border-rose/25 bg-rose/8 p-4 text-[13px]">
      <p className="font-semibold text-rose-ink">{errorText(error)}</p>
      {e?.requestId ? <p className="mt-1 text-[11px] text-inksoft">Reference {e.requestId}</p> : null}
      {onRetry && e?.code !== "FORBIDDEN" ? (
        <Button variant="glass" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Renders a query's loading, error, empty and data states consistently. `isEmpty` decides the empty state; while
 * offline with cached data, the data is shown (the banner explains it may be out of date).
 */
export function QueryState<T>({ query, isEmpty, empty, loading, children }: { query: UseQueryResult<T>; isEmpty?: (d: T) => boolean; empty?: ReactNode; loading?: ReactNode; children: (data: T) => ReactNode }) {
  if (query.data !== undefined) {
    if (isEmpty?.(query.data)) return <>{empty ?? <EmptyState title="Nothing here yet." />}</>;
    return <>{children(query.data)}</>;
  }
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return <>{loading ?? <LoadingState />}</>;
}

/** A whole-card version, for side panels. */
export function CardQuery<T>(props: Parameters<typeof QueryState<T>>[0] & { title?: string }) {
  return <GlassCard>{props.title ? <h2 className="mb-3 font-display text-[15px] font-semibold tracking-tight">{props.title}</h2> : null}<QueryState {...props} /></GlassCard>;
}
