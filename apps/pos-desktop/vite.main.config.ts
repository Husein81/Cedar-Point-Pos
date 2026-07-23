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
    // SSR mode externalizes node_modules by default, leaving a bare
    // require("dotenv") that electron-builder prunes from app.asar (dotenv is a
    // devDependency). Force it to be bundled into main.cjs instead.
    ssr: {
      noExternal: ["dotenv"],
    },
    define: {
      __GH_UPDATE_TOKEN__: JSON.stringify(env.VITE_GITHUB_UPDATE_TOKEN ?? ""),
    },
  };
});
