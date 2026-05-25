import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/electron/main.ts",
      formats: ["cjs"], // ✅ REQUIRED
    },
    rollupOptions: {
      external: ["electron", "better-sqlite3"],
    },
  },
});
