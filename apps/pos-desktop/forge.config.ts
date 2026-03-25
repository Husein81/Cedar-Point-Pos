import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { ForgeConfig } from "@electron-forge/shared-types";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: "./public/assets/icon",
  },

  rebuildConfig: {},

  makers: [
    new MakerZIP({}, ["darwin"]),
    new MakerRpm({}),
    new MakerDMG({
      icon: "./public/assets/icon.icns",
    }),
    new MakerDeb({
      options: {
        icon: "./public/assets/icon.png",
      },
    }),
    new MakerSquirrel({
      name: "CedarPointPOS",
      iconUrl:
        "https://github.com/Husein81/Pointverse/tree/main/apps/pos-desktop/public/assets/icon.ico",
      setupIcon: "./public/assets/icon.ico",
    }),
  ],

  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "Husein81",
          name: "CedarPoint",
        },
        prerelease: false,
        draft: false,
      },
    },
  ],

  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/electron/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/electron/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.config.ts",
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
