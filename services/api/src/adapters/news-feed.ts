/**
 * RSS 2.0 and Atom parsing for news import. Only titles, links, teasers, dates and authors are taken; the full text
 * of the source is never stored. Imported items wait for editorial review.
 */
export interface FeedItem {
  title: string;
  link: string;
  summary?: string;
  publicationDate?: string;
  author?: string;
}

export interface FeedConfig {
  url: string;
  source: string;
  regionCode: string;
  category: "biosecurity" | "health" | "nutrition" | "housing" | "management" | "hatchery" | "welfare" | "markets" | "policy" | "business" | "general";
}

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .trim();

function tag(block: string, name: string): string | undefined {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]!) : undefined;
}

function isoDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

export function parseFeed(xml: string): FeedItem[] {
  const out: FeedItem[] = [];
  if (/<feed[\s>]/i.test(xml)) {
    for (const m of xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)) {
      const e = m[1]!;
      const href = e.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)?.[1] ?? e.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1];
      const title = tag(e, "title");
      if (!title || !href) continue;
      const author = e.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/i)?.[1];
      out.push({ title, link: decode(href), ...((tag(e, "summary") ?? tag(e, "content")) ? { summary: tag(e, "summary") ?? tag(e, "content")! } : {}), ...(isoDate(tag(e, "published") ?? tag(e, "updated")) ? { publicationDate: isoDate(tag(e, "published") ?? tag(e, "updated"))! } : {}), ...(author ? { author: decode(author) } : {}) });
    }
    return out;
  }
  for (const m of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)) {
    const it = m[1]!;
    const title = tag(it, "title");
    const link = tag(it, "link") ?? tag(it, "guid");
    if (!title || !link) continue;
    const author = tag(it, "dc:creator") ?? tag(it, "author");
    const date = isoDate(tag(it, "pubDate") ?? tag(it, "dc:date"));
    const summary = tag(it, "description");
    out.push({ title, link, ...(summary ? { summary } : {}), ...(date ? { publicationDate: date } : {}), ...(author ? { author } : {}) });
  }
  return out;
}

/** Fetches and parses one feed. Behind a function so a different source can replace it. */
export async function fetchFeed(cfg: FeedConfig, fetchImpl: typeof fetch = fetch): Promise<FeedItem[]> {
  const res = await fetchImpl(cfg.url, { signal: AbortSignal.timeout(10_000), headers: { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" } });
  if (!res.ok) throw new Error(`Feed ${cfg.url} returned ${res.status}`);
  return parseFeed(await res.text());
}
