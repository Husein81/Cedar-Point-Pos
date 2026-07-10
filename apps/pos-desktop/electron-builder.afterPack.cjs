const path = require("node:path");
const { flipFuses, FuseVersion, FuseV1Options } = require("@electron/fuses");

const WINDOWS_PLATFORM_NAME = "win32";
const MACOS_PLATFORM_NAME = "darwin";

function resolveElectronExecutablePath(context) {
  const { appOutDir, electronPlatformName, packager } = context;
  const executableName = packager.appInfo.productFilename;

  if (electronPlatformName === MACOS_PLATFORM_NAME) {
    return path.join(
      appOutDir,
      `${executableName}.app`,
      "Contents",
      "MacOS",
      executableName,
    );
  }

  const extension = electronPlatformName === WINDOWS_PLATFORM_NAME ? ".exe" : "";
  return path.join(appOutDir, `${executableName}${extension}`);
}

module.exports = async function afterPack(context) {
  await flipFuses(resolveElectronExecutablePath(context), {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    resetAdHocDarwinSignature: context.electronPlatformName === MACOS_PLATFORM_NAME,
  });
};
