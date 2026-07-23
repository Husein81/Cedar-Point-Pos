// Launches Electron with ELECTRON_RUN_AS_NODE removed from the environment.
// Editors/terminals embedded in Electron apps (e.g. VS Code) export
// ELECTRON_RUN_AS_NODE=1 to child shells; any set value — even "" — makes the
// Electron binary run as plain Node, where require("electron") returns the
// npm stub instead of the runtime API. Deleting the variable is the only fix.
const { spawn } = require("node:child_process");

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

env.NODE_ENV = env.NODE_ENV ?? "development";
env.VITE_DEV_SERVER_URL = env.VITE_DEV_SERVER_URL ?? "http://localhost:5174";

// Resolve the electron binary path from the npm package.
const electronPath = require("electron");

const child = spawn(electronPath, ["."], {
  cwd: __dirname + "/..",
  env,
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 0));
