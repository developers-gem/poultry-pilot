import type { ErrorCode } from "@poultrypilot/types";

/** Thrown by domain functions when a business rule is violated. The API maps `code` to HTTP status. */
export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
