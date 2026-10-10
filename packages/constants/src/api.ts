/** API surface constants shared by the server, web client and contract generator. */
export const API_VERSION = "v1" as const;
export const API_PREFIX = `/api/${API_VERSION}` as const;

/** Request headers the API understands. CORS allows exactly these. */
export const HEADERS = {
  requestId: "X-Request-Id",
  deviceId: "X-Device-Id",
  idempotencyKey: "Idempotency-Key",
  idempotentReplayed: "Idempotent-Replayed",
} as const;
