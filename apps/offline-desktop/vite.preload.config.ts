import { defineConfig } from "vite";

export default defineConfig({
  build: {
    ssr: true,
    outDir: "dist-electron",
    emptyOutDir: false,
    lib: {
      entry: "src/electron/preload.ts",
      formats: ["cjs"],
      fileName: "preload",
    },
    rollupOptions: {
      external: ["electron"],
    },
  },
});
