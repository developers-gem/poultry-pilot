// src/adapters/news-feed.ts
var decode = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&").trim();
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : void 0;
}
function isoDate(raw) {
  if (!raw) return void 0;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? void 0 : d.toISOString().slice(0, 10);
}
function parseFeed(xml) {
  const out = [];
  if (/<feed[\s>]/i.test(xml)) {
    for (const m of xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)) {
      const e = m[1];
      const href = e.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)?.[1] ?? e.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1];
      const title = tag(e, "title");
      if (!title || !href) continue;
      const author = e.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/i)?.[1];
      out.push({ title, link: decode(href), ...tag(e, "summary") ?? tag(e, "content") ? { summary: tag(e, "summary") ?? tag(e, "content") } : {}, ...isoDate(tag(e, "published") ?? tag(e, "updated")) ? { publicationDate: isoDate(tag(e, "published") ?? tag(e, "updated")) } : {}, ...author ? { author: decode(author) } : {} });
    }
    return out;
  }
  for (const m of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)) {
    const it = m[1];
    const title = tag(it, "title");
    const link = tag(it, "link") ?? tag(it, "guid");
    if (!title || !link) continue;
    const author = tag(it, "dc:creator") ?? tag(it, "author");
    const date = isoDate(tag(it, "pubDate") ?? tag(it, "dc:date"));
    const summary = tag(it, "description");
    out.push({ title, link, ...summary ? { summary } : {}, ...date ? { publicationDate: date } : {}, ...author ? { author } : {} });
  }
  return out;
}
async function fetchFeed(cfg, fetchImpl = fetch) {
  const res = await fetchImpl(cfg.url, { signal: AbortSignal.timeout(1e4), headers: { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" } });
  if (!res.ok) throw new Error(`Feed ${cfg.url} returned ${res.status}`);
  return parseFeed(await res.text());
}
export {
  fetchFeed,
  parseFeed
};
//# sourceMappingURL=news-feed-AF7ESRLV.js.map