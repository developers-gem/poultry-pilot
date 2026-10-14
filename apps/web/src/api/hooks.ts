import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useAuth, useFarm } from "./auth";
import { ApiError, authedRequest } from "./client";
import { toast } from "../components/toast";

/** GET a farm-scoped endpoint. Keyed by farm, so switching farms never shows another farm's data. */
export function useFarmQuery<T>(path: string, opts: { enabled?: boolean; refetchInterval?: number } = {}) {
  const farm = useFarm();
  return useQuery({
    queryKey: ["farm", farm.farmId, path],
    queryFn: () => authedRequest<T>(`/farms/${farm.farmId}${path}`),
    enabled: opts.enabled ?? true,
    ...(opts.refetchInterval ? { refetchInterval: opts.refetchInterval } : {}),
  });
}

/** GET an endpoint that is not farm-scoped (content, marketplace browsing, /me). */
export function useApiQuery<T>(path: string, opts: { enabled?: boolean } = {}) {
  const { status } = useAuth();
  return useQuery({ queryKey: ["root", path], queryFn: () => authedRequest<T>(path), enabled: (opts.enabled ?? true) && status === "signedIn" });
}

export type Method = "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * A write through the API. On success the given query prefixes are refreshed (by default everything of this
 * farm, since one write can change several screens: a feed purchase changes stock, money and the dashboard).
 */
export function useFarmMutation<TBody = unknown, TResult = unknown>(method: Method, path: string | ((body: TBody) => string), opts: { success?: string; invalidate?: QueryKey[]; root?: boolean } = {}) {
  const farm = useAuth().farm;
  const qc = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: async (body: TBody) => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) throw new ApiError("OFFLINE", "You're offline. Reconnect and try again; nothing was saved.", 0);
      const p = typeof path === "function" ? path(body) : path;
      const full = opts.root ? p : `/farms/${farm?.farmId}${p}`;
      return authedRequest<TResult>(full, { method, ...(method === "DELETE" || body === undefined ? {} : { body: JSON.stringify(stripBodyKeys(body)) }) });
    },
    onSuccess: async () => {
      await Promise.all((opts.invalidate ?? [opts.root ? ["root"] : ["farm", farm?.farmId]]).map((k) => qc.invalidateQueries({ queryKey: k })));
      if (opts.success) toast.success(opts.success);
    },
  });
}

/** Keys starting with "_" are client-only (e.g. ids used to build the path) and never sent. */
function stripBodyKeys<T>(body: T): T {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  return Object.fromEntries(Object.entries(body as Record<string, unknown>).filter(([k]) => !k.startsWith("_"))) as T;
}
