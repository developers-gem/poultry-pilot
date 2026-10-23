import "./chunk-6YTPLJIP.js";

// src/create-indexes.ts
import mongoose from "mongoose";
var uri = process.env["MONGODB_URI"];
if (!uri) {
  console.error("MONGODB_URI is not set");
  process.exit(1);
}
async function main() {
  await mongoose.connect(uri, { autoIndex: false, serverSelectionTimeoutMS: 15e3 });
  let failed = 0;
  for (const model of Object.values(mongoose.connection.models)) {
    try {
      await model.createCollection().catch(() => void 0);
      await model.createIndexes();
      const n = (await model.collection.indexes()).length;
      console.log(`\u2713 ${model.collection.collectionName}: ${n} indexes`);
    } catch (err) {
      failed++;
      console.error(`\u2717 ${model.collection.collectionName}: ${err.message}`);
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
  console.error(err.message);
  process.exit(1);
});
//# sourceMappingURL=create-indexes.js.map