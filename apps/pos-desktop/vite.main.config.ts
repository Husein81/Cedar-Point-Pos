import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
    build: {
      ssr: true,
      outDir: "dist-electron",
      emptyOutDir: false,
      lib: {
        entry: "src/electron/main.ts",
        formats: ["cjs"],
        fileName: "main",
      },
      rollupOptions: {
        external: ["electron", "better-sqlite3", "electron-updater"],
      },
    },
    define: {
      __GH_UPDATE_TOKEN__: JSON.stringify(env.VITE_GITHUB_UPDATE_TOKEN ?? ""),
    },
  };
});
