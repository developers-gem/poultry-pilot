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
