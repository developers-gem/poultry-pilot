import { DeleteObjectCommand, GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { MediaStorage } from "../ports/external.js";
import { SAFE_KEY } from "./storage.js";

export interface S3Config {
  bucket: string;
  region: string;
  /** For S3-compatible services (Cloudflare R2, MinIO, Backblaze B2, DigitalOcean Spaces). */
  endpoint?: string;
  forcePathStyle?: boolean;
}

/**
 * Photos in an S3-compatible bucket: shared by every API instance and kept across deploys (the local-disk store is
 * for a single server with a persistent volume). Credentials come from the standard AWS environment or the
 * instance role. The bucket should be private: files are only served through the API, to farm members.
 */
export function s3MediaStorage(cfg: S3Config, client = new S3Client({ region: cfg.region, ...(cfg.endpoint ? { endpoint: cfg.endpoint } : {}), forcePathStyle: cfg.forcePathStyle ?? !!cfg.endpoint })): MediaStorage {
  const check = (key: string) => {
    if (!SAFE_KEY.test(key)) throw new Error("Invalid storage key");
    return key;
  };
  return {
    async put(key, bytes, contentType) {
      await client.send(new PutObjectCommand({ Bucket: cfg.bucket, Key: check(key), Body: bytes, ContentType: contentType, ServerSideEncryption: cfg.endpoint ? undefined : "AES256" }));
    },
    async get(key) {
      try {
        const r = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: check(key) }));
        if (!r.Body) return null;
        const bytes = Buffer.from(await r.Body.transformToByteArray());
        return { bytes, contentType: r.ContentType ?? "application/octet-stream" };
      } catch (e) {
        if (e instanceof NoSuchKey || (e as { name?: string }).name === "NoSuchKey" || (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return null;
        throw e;
      }
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: check(key) }));
    },
  };
}
