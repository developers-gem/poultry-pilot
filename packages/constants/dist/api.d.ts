/** API surface constants shared by the server, web client and contract generator. */
export declare const API_VERSION: "v1";
export declare const API_PREFIX: "/api/v1";
/** Request headers the API understands. CORS allows exactly these. */
export declare const HEADERS: {
    readonly requestId: "X-Request-Id";
    readonly deviceId: "X-Device-Id";
    readonly idempotencyKey: "Idempotency-Key";
    readonly idempotentReplayed: "Idempotent-Replayed";
};
