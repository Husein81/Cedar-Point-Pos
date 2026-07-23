/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_SERVICE_ROLE_KEY: string;
  readonly VITE_GITHUB_TOKEN: string;
  readonly VITE_GITHUB_UPDATE_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
