/**
 * Creates every MongoDB index the models define (unique keys included), on the database in MONGODB_URI.
 * Run on each deploy, before traffic: `node dist/create-indexes.js` in the image (or `pnpm --filter @poultrypilot/api db:indexes` locally).
 * Idempotent (existing indexes are kept); fails loudly if an index cannot be built, e.g. a unique index blocked by
 * duplicate data, so a deploy never runs without the keys that prevent duplicates.
 */
import mongoose from "mongoose";
import "./adapters/mongo/models/index.js";

const uri = process.env["MONGODB_URI"];
if (!uri) {
  console.error("MONGODB_URI is not set");
  process.exit(1);
}

async function main() {
  await mongoose.connect(uri!, { autoIndex: false, serverSelectionTimeoutMS: 15_000 });
  let failed = 0;
  for (const model of Object.values(mongoose.connection.models)) {
    try {
      await model.createCollection().catch(() => undefined); // already exists: fine
      await model.createIndexes();
      const n = (await model.collection.indexes()).length;
      console.log(`✓ ${model.collection.collectionName}: ${n} indexes`);
    } catch (err) {
      failed++;
      console.error(`✗ ${model.collection.collectionName}: ${(err as Error).message}`);
    }
  }
  await mongoose.disconnect();
  if (failed) {
    console.error(`${failed} collection(s) could not be indexed; fix the data and run again before serving traffic.`);
    process.exit(1);
  }
  console.log("All indexes in place.");
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});
