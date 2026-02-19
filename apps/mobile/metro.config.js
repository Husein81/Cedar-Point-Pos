const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const path = require("path");

// Find the project and workspace root
const projectRoot = __dirname;
// This can be replaced with `find-up` or a similar library, but for now we'll assume it's two levels up
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Force Metro to resolve (and bundle) from their own package roots
config.resolver.disableHierarchicalLookup = true;

// 4. Ignore build directories from other apps and system folders
config.resolver.blockList = [
  // Desktop
  /apps\/pos-desktop\/\.vite\/.*/,
  /apps\/pos-desktop\/dist\/.*/,

  // API
  /apps\/api\/dist\/.*/,
  /apps\/api\/generated\/.*/,

  // System Admin
  /apps\/system-admin\/\.next\/.*/,
  /apps\/system-admin\/out\/.*/,

  // Generic build/dep folders
  /.*\/node_modules\/.*\/node_modules\/.*/,
  /.*\.git\/.*/,
  /.*\.expo\/.*/,
  /.*\.hg\/.*/,
  /.*\.svn\/.*/,
];

module.exports = withUniwindConfig(config, {
  // relative path to your global.css file (from previous step)
  cssEntryFile: "./global.css",
  // (optional) path where we gonna auto-generate typings
  // defaults to project's root
  dtsFile: "./uniwind-types.d.ts",
});
