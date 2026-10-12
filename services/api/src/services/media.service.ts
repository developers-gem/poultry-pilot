import type { MediaAssetView } from "@poultrypilot/types";
import { createHash } from "node:crypto";
import { AppError, notFound } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { MediaStorage } from "../ports/external.js";
import type { Repositories } from "../ports/repositories.js";
import type { MediaAssetRecord } from "../ports/records.js";
import type { AuditService } from "./audit.service.js";
import { assertCan, type FarmContext } from "./context.js";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Identify the image type from its first bytes; the declared Content-Type is not trusted. */
export function sniffImage(b: Buffer): { contentType: MediaAssetRecord["contentType"]; ext: "jpg" | "png" | "webp" | "pdf" } | null {
  if (b.length >= 5 && b.subarray(0, 5).toString("latin1") === "%PDF-") return { contentType: "application/pdf", ext: "pdf" };
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { contentType: "image/jpeg", ext: "jpg" };
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { contentType: "image/png", ext: "png" };
  if (b.length >= 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return { contentType: "image/webp", ext: "webp" };
  return null;
}

export function createMediaService(d: { repos: Repositories; clock: Clock; audit: AuditService; storage: MediaStorage }) {
  const url = (farmId: string, id: string) => `/api/v1/farms/${farmId}/media/${id}`;
  const view = (a: MediaAssetRecord): MediaAssetView => ({ id: a.id, contentType: a.contentType, sizeBytes: a.sizeBytes, url: url(a.farmId, a.id), createdAt: a.createdAt.toISOString() });

  return {
    /** Stores a photo for this farm. Mobile apps should resize and compress before uploading (≈ 1600 px, JPEG 80%). */
    async upload(ctx: FarmContext, bytes: Buffer): Promise<MediaAssetView> {
      assertCan(ctx, "production.record");
      if (!bytes?.length) throw new AppError("VALIDATION_FAILED", "Send the photo as the request body");
      if (bytes.length > MAX_PHOTO_BYTES) throw new AppError("VALIDATION_FAILED", "Photos can be at most 5 MB");
      const kind = sniffImage(bytes);
      if (!kind) throw new AppError("VALIDATION_FAILED", "Only JPEG, PNG or WebP photos, or PDF documents (e.g. lab reports), can be uploaded");
      const id = newId();
      const storageKey = `${ctx.farmId}/${id}.${kind.ext}`;
      const now = d.clock.now();
      const rec: MediaAssetRecord = {
        id,
        farmId: ctx.farmId,
        contentType: kind.contentType,
        sizeBytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        storageKey,
        createdBy: ctx.userId,
        createdAt: now,
        updatedAt: now,
        version: 0,
      };
      await d.storage.put(storageKey, bytes, kind.contentType);
      try {
        await d.repos.tx.run(async (tx) => {
          await d.repos.mediaAssets.insert(rec, tx);
          await d.audit.record(ctx, { action: "media.uploaded", entity: "media_asset", entityId: id, after: { contentType: rec.contentType, sizeBytes: rec.sizeBytes } }, tx);
        });
      } catch (e) {
        await d.storage.delete(storageKey).catch(() => undefined);
        throw e;
      }
      return view(rec);
    },

    async read(ctx: FarmContext, id: string): Promise<{ bytes: Buffer; contentType: string }> {
      assertCan(ctx, "production.read");
      const a = await d.repos.mediaAssets.findById(ctx.farmId, id);
      if (!a) throw notFound("Photo");
      const obj = await d.storage.get(a.storageKey);
      if (!obj) throw notFound("Photo");
      return { bytes: obj.bytes, contentType: a.contentType };
    },
  };
}

export type MediaService = ReturnType<typeof createMediaService>;
