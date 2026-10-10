import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";

/**
 * In development the web app calls /api/* on its own origin and Vite proxies it to the API,
 * so no CORS setup is needed locally. In production set VITE_API_BASE_URL to the API origin.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    server: {
      port: 5173,
      strictPort: true,
      proxy: { "/api": { target: env["API_PROXY_TARGET"] ?? "http://localhost:4000", changeOrigin: true } },
    },
    preview: { port: 4173 },
    build: { sourcemap: true },
  };
});
