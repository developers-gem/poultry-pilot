import { describe, expect, it } from "vitest";
import { s3MediaStorage } from "../adapters/s3-storage.js";

/** A stand-in S3 client: stores objects in a map, answers like S3 for a missing key. */
function fakeS3() {
  const objects = new Map<string, { body: Buffer; type: string }>();
  return {
    objects,
    async send(cmd: { constructor: { name: string }; input: { Key: string; Body?: Buffer; ContentType?: string } }) {
      const { Key } = cmd.input;
      switch (cmd.constructor.name) {
        case "PutObjectCommand":
          objects.set(Key, { body: cmd.input.Body!, type: cmd.input.ContentType! });
          return {};
        case "GetObjectCommand": {
          const o = objects.get(Key);
          if (!o) throw Object.assign(new Error("NoSuchKey"), { name: "NoSuchKey", $metadata: { httpStatusCode: 404 } });
          return { Body: { transformToByteArray: async () => new Uint8Array(o.body) }, ContentType: o.type };
        }
        case "DeleteObjectCommand":
          objects.delete(Key);
          return {};
      }
      throw new Error("unexpected command");
    },
  };
}

describe("S3 media storage", () => {
  const key = "01a00000-0000-7000-8000-000000000001/01a00000-0000-7000-8000-000000000002.jpg";

  it("stores, reads back and deletes photos; a missing photo is null", async () => {
    const s3 = fakeS3();
    const store = s3MediaStorage({ bucket: "pp", region: "eu-west-1" }, s3 as never);
    await store.put(key, Buffer.from([0xff, 0xd8, 0xff, 1]), "image/jpeg");
    expect(await store.get(key)).toEqual({ bytes: Buffer.from([0xff, 0xd8, 0xff, 1]), contentType: "image/jpeg" });
    await store.delete(key);
    expect(await store.get(key)).toBeNull();
  });

  it("refuses keys outside the farm/asset pattern (no path tricks reach the bucket)", async () => {
    const s3 = fakeS3();
    const store = s3MediaStorage({ bucket: "pp", region: "eu-west-1" }, s3 as never);
    await expect(store.put("../other-farm/secret.jpg", Buffer.from([1]), "image/jpeg")).rejects.toThrow(/Invalid storage key/);
    expect(s3.objects.size).toBe(0);
  });
});
