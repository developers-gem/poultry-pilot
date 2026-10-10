import type { DependencyStatus, HealthResponse } from "@poultrypilot/types";
import { useHealth } from "../api/health";
import { ApiError, apiBaseUrl } from "../api/client";

type Overall = "checking" | "ok" | "degraded" | "unreachable";

const COPY: Record<Overall, { title: string; body: string; tone: string }> = {
  checking: { title: "Checking the API…", body: "Contacting the PoultryPilot API.", tone: "bg-line" },
  ok: { title: "Everything is running", body: "The API is up and connected to MongoDB.", tone: "bg-mint" },
  degraded: {
    title: "The API is running, but MongoDB is not reachable",
    body: "Start the database with docker compose up -d mongo, then wait for it to report healthy.",
    tone: "bg-amber",
  },
  unreachable: {
    title: "The API is not reachable",
    body: "Start it with pnpm dev:api from the repository root, and check that it is listening on port 4000.",
    tone: "bg-rose",
  },
};

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : m > 0 ? `${m} min` : `${seconds} s`;
}

function Check({ name, check }: { name: string; check?: DependencyStatus }) {
  const up = check?.status === "up";
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div>
        <p className="font-medium">{name}</p>
        {check?.error && <p className="mt-1 text-sm text-inksoft">{check.error}</p>}
      </div>
      <p className={`shrink-0 text-sm font-medium ${up ? "text-mint" : check ? "text-rose" : "text-inksoft"}`}>
        {check ? (up ? (check.latencyMs !== undefined ? `Connected in ${check.latencyMs} ms` : "Responding") : "Not connected") : "Unknown"}
      </p>
    </div>
  );
}

export function SystemStatus() {
  const { data, error, isPending, isFetching, refetch, dataUpdatedAt } = useHealth();
  const health: HealthResponse | undefined = data?.data;
  const overall: Overall = isPending ? "checking" : error ? "unreachable" : health?.status === "ok" ? "ok" : "degraded";
  const copy = COPY[overall];
  const target = apiBaseUrl() || "this site's /api (proxied to the API in development)";

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section className="panel p-7 sm:p-9" aria-labelledby="status-title">
        <div role="status" aria-live="polite" className="flex items-start gap-4">
          <span aria-hidden className={`mt-2 size-3 shrink-0 rounded-full ${copy.tone}`} />
          <div>
            <h1 id="status-title" className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-prose text-inksoft">{copy.body}</p>
            {error instanceof ApiError && overall === "unreachable" && (
              <p className="mt-2 text-sm text-inksoft">Details: {error.message}</p>
            )}
          </div>
        </div>

        <div className="mt-8 divide-y divide-line border-y border-line">
          <Check name="API" check={overall === "checking" ? undefined : error ? { status: "down", error: "No response" } : { status: "up", latencyMs: undefined }} />
          <Check name="MongoDB" check={health?.checks.mongodb} />
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="mt-6 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {isFetching ? "Checking…" : "Check again"}
        </button>
      </section>

      <aside className="panel p-7 text-sm" aria-label="Service details">
        <h2 className="font-display text-lg font-semibold">Service details</h2>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3">
          <dt className="text-inksoft">Version</dt>
          <dd>{health?.version ?? "—"}</dd>
          <dt className="text-inksoft">Environment</dt>
          <dd>{health?.environment ?? "—"}</dd>
          <dt className="text-inksoft">Running for</dt>
          <dd>{health ? formatUptime(health.uptimeSeconds) : "—"}</dd>
          <dt className="text-inksoft">Last checked</dt>
          <dd>{dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "—"}</dd>
          <dt className="text-inksoft">API address</dt>
          <dd className="break-words">{target}</dd>
        </dl>
        <p className="mt-6 text-inksoft">
          This page checks again every 15 seconds. Farm screens will be added here as each module is built.
        </p>
      </aside>
    </div>
  );
}
