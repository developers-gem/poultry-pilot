import { useState } from "react";
import { ApiError } from "../api/client";
import { useNews, type NewsItem } from "../api/content";

/**
 * Poultry news for the reader's region. Everything shown comes from GET /api/v1/content/news (editor-reviewed,
 * with source, link and date); nothing is written into this component.
 */
export function News() {
  const [region, setRegion] = useState("");
  const news = useNews({ ...(region ? { region } : {}), limit: 30 });
  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">News</h1>
          <p className="mt-1 text-sm text-inksoft">Reviewed by the PoultryPilot editors. Each item links to its original source.</p>
        </div>
        <label className="text-sm">
          <span className="mr-2 text-inksoft">Region</span>
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 6))}
            placeholder="e.g. IN or IN-UP"
            aria-label="Region code"
            className="w-32 rounded-lg border border-line px-3 py-1.5"
          />
        </label>
      </div>
      <div className="mt-8">
        {news.isPending && <p className="text-inksoft">Loading news…</p>}
        {news.isError && <NewsError error={news.error} />}
        {news.isSuccess && news.data.length === 0 && <p className="text-inksoft">No news for this region yet.</p>}
        {news.isSuccess && (
          <ul className="divide-y divide-line">
            {news.data.map((n) => (
              <NewsRow key={n.id} item={n} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function NewsRow({ item }: { item: NewsItem }) {
  return (
    <li className="py-5">
      <p className="text-xs uppercase tracking-wide text-inksoft">
        {[item.category, item.region, item.publicationDate].filter(Boolean).join(" · ")}
      </p>
      <h2 className="mt-1 text-lg font-medium">{item.title}</h2>
      {item.summary && <p className="mt-2 text-inksoft">{item.summary}</p>}
      <p className="mt-2 text-sm">
        {item.source && <span>{item.source}</span>}
        {item.author && <span className="text-inksoft"> · {item.author}</span>}
        {item.sourceUrl && (
          <>
            {" · "}
            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">
              Read the original
            </a>
          </>
        )}
      </p>
    </li>
  );
}

function NewsError({ error }: { error: Error }) {
  const code = error instanceof ApiError ? error.code : "UNKNOWN";
  if (code === "UNAUTHENTICATED") return <p className="text-inksoft">Sign in to read news.</p>;
  return <p className="text-rose">News could not be loaded ({code}). Try again shortly.</p>;
}
