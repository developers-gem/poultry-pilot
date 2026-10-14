/**
 * Captures the real API responses the mobile app consumes and writes them to apps/mobile/test/fixtures.
 * The Dart model tests parse these files, and services/api/src/test/mobile-contract.test.ts fails when the API's
 * responses no longer match them, so the app and the API cannot drift apart silently.
 *   npx tsx services/api/scripts/mobile-fixtures.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { captureMobileFixtures } from "../src/test/mobile-fixtures.js";

const dir = join(process.cwd(), "apps/mobile/test/fixtures");
mkdirSync(dir, { recursive: true });
captureMobileFixtures().then((fixtures) => {
  for (const [name, body] of Object.entries(fixtures)) writeFileSync(join(dir, `${name}.json`), `${JSON.stringify(body, null, 2)}\n`);
  console.log(`wrote ${Object.keys(fixtures).length} fixtures to ${dir}`);
});
