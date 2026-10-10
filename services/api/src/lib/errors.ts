import { ERROR_CODES, type ErrorCode } from "@poultrypilot/constants";

export class AppError extends Error {
  readonly status: number;
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.status = ERROR_CODES[code];
  }
}

export const notFound = (what: string) => new AppError("NOT_FOUND", `${what} not found`);
export const forbidden = (msg = "You do not have permission to do this") => new AppError("FORBIDDEN", msg);
