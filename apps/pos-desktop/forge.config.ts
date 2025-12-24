import { ForgeConfig } from "@electron-forge/shared-types";
import { VitePlugin } from "@electron-forge/plugin-vite";

const config: ForgeConfig = {
  packagerConfig: {},
  rebuildConfig: {},
  makers: [],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/electron/main.ts",
          config: "vite.main.config.ts",
        },
        {
          entry: "src/electron/preload.ts",
          config: "vite.preload.config.ts",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.config.ts",
        },
      ],
    }),
  ],
};

export default config;
