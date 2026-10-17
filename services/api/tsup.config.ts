import { defineConfig } from "tsup";

/** Bundles workspace packages (which ship TypeScript source) into the API build; npm deps stay external. */
export default defineConfig({
  entry: ["src/server.ts", "src/create-indexes.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  sourcemap: true,
  clean: true,
  noExternal: [/^@poultrypilot\//],
});
