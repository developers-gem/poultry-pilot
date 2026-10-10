/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API origin in production, e.g. https://api.poultrypilot.example. Empty in development (Vite proxies /api). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
