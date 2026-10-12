import { describe, expect, it } from "vitest";
import { parseFeed } from "./news-feed.js";

describe("feed parsing", () => {
  it("reads RSS 2.0 items: title, link, teaser, date, author; CDATA and entities decoded", () => {
    const xml = `<?xml version="1.0"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>X</title>
      <item><title><![CDATA[Egg prices rise &amp; feed costs ease]]></title><link>https://example.org/news/1</link>
      <description><![CDATA[<p>Prices rose <b>4%</b> this week.</p>]]></description><pubDate>Mon, 05 Oct 2026 08:00:00 GMT</pubDate><dc:creator>A. Writer</dc:creator></item>
      <item><title>No link</title></item></channel></rss>`;
    expect(parseFeed(xml)).toEqual([{ title: "Egg prices rise & feed costs ease", link: "https://example.org/news/1", summary: "<p>Prices rose <b>4%</b> this week.</p>", publicationDate: "2026-10-05", author: "A. Writer" }]);
  });
  it("reads Atom entries, preferring the alternate link", () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Avian influenza update</title><link rel="self" href="https://x.org/self"/><link rel="alternate" href="https://x.org/ai-update"/>
      <summary>Situation report</summary><published>2026-10-03T10:00:00Z</published><author><name>WOAH</name></author></entry></feed>`;
    expect(parseFeed(xml)).toEqual([{ title: "Avian influenza update", link: "https://x.org/ai-update", summary: "Situation report", publicationDate: "2026-10-03", author: "WOAH" }]);
  });
  it("ignores garbage and bad dates", () => {
    expect(parseFeed("not xml")).toEqual([]);
    expect(parseFeed("<rss><channel><item><title>T</title><link>https://a.b/c</link><pubDate>someday</pubDate></item></channel></rss>")).toEqual([{ title: "T", link: "https://a.b/c" }]);
  });
});
