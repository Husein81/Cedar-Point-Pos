import { contextBridge, ipcRenderer } from "electron";
import type { IpcChannel, IpcInput, IpcResult } from "../shared/ipc-contract";

// The channels list is duplicated from the contract on purpose: the preload
// runs sandboxed and can only expose what it explicitly whitelists. A channel
// missing here is unreachable from the renderer — safe by default.
const ALLOWED_CHANNELS: ReadonlySet<string> = new Set([
  "auth:login",
  "auth:logout",
  "auth:bootstrap",
  "auth:setup",
  "auth:resume",
  "users:list",
  "users:create",
  "users:update",
  "users:deactivate",
  "categories:list",
  "categories:create",
  "categories:update",
  "categories:delete",
  "colors:list",
  "colors:create",
  "colors:update",
  "colors:delete",
  "colors:seedDefaults",
  "products:list",
  "products:get",
  "products:getByBarcode",
  "products:create",
  "products:update",
  "products:delete",
  "customers:list",
  "customers:create",
  "customers:update",
  "customers:delete",
  "orders:checkout",
  "orders:hold",
  "orders:listHeld",
  "orders:resume",
  "orders:list",
  "orders:get",
  "orders:refund",
  "stock:movements",
  "stock:adjust",
  "stock:purchase",
  "stock:lowStock",
  "shifts:current",
  "shifts:open",
  "shifts:close",
  "shifts:cashMovement",
  "shifts:list",
  "settings:get",
  "settings:update",
  "backup:export",
  "backup:restore",
]);

contextBridge.exposeInMainWorld("electron", {
  sendFrameAction: (action: "MINIMIZE" | "MAXIMIZE" | "CLOSE") => {
    ipcRenderer.send("frame-action", action);
  },
  getAppInfo: () => ipcRenderer.invoke("app:getInfo"),
});

contextBridge.exposeInMainWorld("ipc", {
  invoke: <C extends IpcChannel>(
    channel: C,
    input: IpcInput<C>,
  ): Promise<IpcResult<unknown>> => {
    if (!ALLOWED_CHANNELS.has(channel)) {
      return Promise.resolve({
        ok: false,
        error: { message: `Unknown channel: ${channel}`, code: "BAD_CHANNEL" },
      });
    }
    return ipcRenderer.invoke(channel, input);
  },
});
