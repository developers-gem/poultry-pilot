import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { v7 as uuidv7 } from "uuid";

export const newId = (): string => uuidv7();

/** URL-safe random secret, 32 bytes by default. */
export const randomToken = (bytes = 32): string => randomBytes(bytes).toString("base64url");

export const sha256 = (value: string): string => createHash("sha256").update(value, "utf8").digest("hex");

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export interface Clock {
  now(): Date;
}
export const systemClock: Clock = { now: () => new Date() };

/** Shallow diff for audit events. Only changed top-level keys are recorded. */
export function shallowDiff(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): Record<string, { before: unknown; after: unknown }> {
  const out: Record<string, { before: unknown; after: unknown }> = {};
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const k of keys) {
    if (["updatedAt", "version", "passwordHash", "inviteTokenHash"].includes(k)) continue;
    const b = before?.[k];
    const a = after?.[k];
    if (JSON.stringify(b) !== JSON.stringify(a)) out[k] = { before: b, after: a };
  }
  return out;
}
