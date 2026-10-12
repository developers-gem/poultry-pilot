import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "./client";
import { getAccessToken } from "./session";

/** One news item as the API returns it. Every field comes from the backend; the app holds no news of its own. */
export interface NewsItem {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  source: string | null;
  sourceUrl: string | null;
  publicationDate: string | null;
  region: string;
  category: string;
  author: string | null;
  origin: "original" | "external";
}

export interface NewsParams {
  region?: string;
  category?: string;
  limit?: number;
}

/** GET /api/v1/content/news for the reader's region. */
export async function fetchNews(params: NewsParams = {}, fetchImpl: typeof fetch = fetch, token: string | null = getAccessToken()): Promise<NewsItem[]> {
  const q = new URLSearchParams();
  if (params.region) q.set("region", params.region);
  if (params.category) q.set("category", params.category);
  if (params.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  const res = await apiRequest<{ items: NewsItem[] }>(`/content/news${qs ? `?${qs}` : ""}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {}, fetchImpl);
  return res.data.items;
}

export function useNews(params: NewsParams) {
  return useQuery({ queryKey: ["news", params], queryFn: () => fetchNews(params), staleTime: 5 * 60_000, retry: false });
}
