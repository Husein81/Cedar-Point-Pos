const APP_ID = "com.cedarcore.cedarpointpos.offline";

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: APP_ID,
  productName: "CedarPoint POS Offline",
  directories: { output: "release" },
  files: ["dist/**/*", "dist-electron/**/*", "package.json", "!**/*.map"],
  extraResources: [{ from: "public/assets", to: "assets" }],
  asarUnpack: ["**/node_modules/better-sqlite3/**/*"],
  npmRebuild: true,
  mac: {
    target: ["dmg", "zip"],
    icon: "public/assets/icon.icns",
  },
  linux: {
    target: ["deb", "AppImage"],
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
};
