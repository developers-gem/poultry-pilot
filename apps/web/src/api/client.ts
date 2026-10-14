import { getAccessToken, getRefreshToken, setTokens } from "./session";
import { API_PREFIX } from "@poultrypilot/constants";
import type { ErrorEnvelope } from "@poultrypilot/types";

/**
 * Thin fetch wrapper for the PoultryPilot API. Every failure becomes an ApiError with the
 * server's stable error code, so screens branch on `code`, never on message text.
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly requestId?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiResponse<T> {
  status: number;
  data: T;
}

export function apiBaseUrl(): string {
  return (import.meta.env?.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number; acceptStatuses?: number[] } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<ApiResponse<T>> {
  const { timeoutMs = 10_000, acceptStatuses = [], ...rest } = init;
  let res: Response;
  try {
    res = await fetchImpl(`${apiBaseUrl()}${API_PREFIX}${path}`, {
      ...rest,
      headers: { Accept: "application/json", ...(rest.body ? { "Content-Type": "application/json" } : {}), ...rest.headers },
      signal: rest.signal ?? AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    throw new ApiError(
      timedOut ? "TIMEOUT" : "NETWORK_ERROR",
      timedOut ? `The API did not answer within ${timeoutMs / 1000} seconds.` : "The API could not be reached.",
      0,
    );
  }

  const body: unknown = await res.json().catch(() => undefined);
  if (res.ok || acceptStatuses.includes(res.status)) return { status: res.status, data: body as T };

  const envelope = (body as Partial<ErrorEnvelope> | undefined)?.error;
  throw new ApiError(
    envelope?.code ?? "HTTP_ERROR",
    envelope?.message ?? `Request failed with status ${res.status}.`,
    res.status,
    envelope?.requestId ?? res.headers.get("x-request-id") ?? undefined,
    envelope?.details,
  );
}

// ---- signed-in requests -------------------------------------------------------------------


let refreshing: Promise<boolean> | null = null;
let onSignedOut: (() => void) | null = null;

/** Called once by the auth provider: what to do when the session can no longer be refreshed. */
export function setSignedOutHandler(fn: () => void): void {
  onSignedOut = fn;
}

/** Runs `fn` while holding a lock shared by every tab of this site, where the browser supports Web Locks. */
async function withTabLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? (navigator as Navigator & { locks?: { request(name: string, cb: () => Promise<T>): Promise<T> } }).locks : undefined;
  return locks ? locks.request("poultrypilot-refresh", fn) : fn();
}

/**
 * Exchanges the refresh token for new tokens. Concurrent callers in this tab share one refresh, and tabs take turns
 * (Web Locks), each reading the latest token inside the lock: two tabs opened together must never spend the same
 * refresh token, which the API treats as theft and answers by revoking the session.
 */
export function refreshSession(fetchImpl: typeof fetch = fetch): Promise<boolean> {
  if (refreshing) return refreshing;
  if (!getRefreshToken()) return Promise.resolve(false);
  refreshing = withTabLock(async () => {
    const token = getRefreshToken();
    if (!token) throw new ApiError("UNAUTHENTICATED", "Signed out", 401);
    return apiRequest<{ accessToken: string; refreshToken: string }>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: token }) }, fetchImpl);
  })
    .then((r) => {
      setTokens(r.data);
      return true;
    })
    .catch((e: unknown) => {
      // A network failure is not a sign-out: keep the refresh token for when the connection returns.
      if (e instanceof ApiError && e.status !== 0) setTokens(null);
      return false;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * An API call as the signed-in person: adds the bearer token, refreshes once on an expired token and retries.
 * If the session cannot be refreshed, the person is signed out.
 */
export async function authedRequest<T>(path: string, init: Parameters<typeof apiRequest>[1] = {}, fetchImpl: typeof fetch = fetch): Promise<T> {
  const withToken = () => {
    const token = getAccessToken();
    return { ...init, headers: { ...(init.headers as Record<string, string> | undefined), ...(token ? { Authorization: `Bearer ${token}` } : {}) } };
  };
  try {
    if (!getAccessToken() && getRefreshToken()) await refreshSession(fetchImpl);
    return (await apiRequest<T>(path, withToken(), fetchImpl)).data;
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401) throw e;
    if (await refreshSession(fetchImpl)) return (await apiRequest<T>(path, withToken(), fetchImpl)).data;
    setTokens(null);
    onSignedOut?.();
    throw e;
  }
}

/** Downloads a file the API generates (reports, calendar), as the signed-in person. */
export async function downloadFile(path: string, fallbackName: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  const go = async () => fetchImpl(`${apiBaseUrl()}${API_PREFIX}${path}`, { headers: getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {} });
  let res = await go();
  if (res.status === 401 && (await refreshSession(fetchImpl))) res = await go();
  if (!res.ok) {
    const body = (await res.json().catch(() => undefined)) as Partial<ErrorEnvelope> | undefined;
    throw new ApiError(body?.error?.code ?? "HTTP_ERROR", body?.error?.message ?? `Download failed (${res.status})`, res.status);
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
