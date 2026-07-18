require("dotenv").config();
process.env.GH_TOKEN = process.env.VITE_GITHUB_TOKEN;

const APP_ID = "com.cedarcore.cedarpointpos";

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: APP_ID,
  directories: { output: "release" },
  files: [
    "dist/**/*",
    "dist-electron/**/*",
    "package.json",
    "!**/*.map",
    // electron-builder's pnpm dependency collector misdetects these hoisted
    // packages as missing and drops them, even though electron-updater
    // requires them directly at runtime. Copy them in explicitly.
    {
      from: "../../node_modules/builder-util-runtime",
      to: "node_modules/builder-util-runtime",
    },
    { from: "../../node_modules/semver", to: "node_modules/semver" },
  ],
  extraResources: [{ from: "public/assets", to: "assets" }],
  asarUnpack: ["**/node_modules/better-sqlite3/**/*"],
  npmRebuild: true,
  afterPack: require("./electron-builder.afterPack.cjs"),
  mac: {
    target: ["dmg", "zip"],
    icon: "public/assets/icon.icns",
  },
  linux: {
    target: ["deb", "rpm", "AppImage"],
    icon: "public/assets/icon.png",
  },
  win: {
    target: ["nsis"],
    icon: "public/assets/icon.ico",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },
  publish: [
    {
      provider: "github",
      owner: "Husein81",
      repo: "Cedar-Point-Pos",
      releaseType: "draft",
      private: true,
    },
  ],
};
