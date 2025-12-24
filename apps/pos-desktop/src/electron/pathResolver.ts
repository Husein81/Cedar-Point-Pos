import path from "node:path";

export function getPreloadPath() {
  return path.join(__dirname, "preload.js");
}
