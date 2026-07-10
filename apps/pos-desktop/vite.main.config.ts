import { defineConfig } from "vite";

export default defineConfig({
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
});
