// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";
import { Operation } from "./database/syncQueue";

contextBridge.exposeInMainWorld("electron", {
  sendFrameAction: (action: "MINIMIZE" | "MAXIMIZE" | "CLOSE") => {
    ipcRenderer.send("frame-action", action);
  },
});

// Wraps `ipcRenderer.on` as a subscribe call returning its own unsubscribe —
// callers don't need to know the underlying channel name or listener shape.
function subscribe<T>(channel: string, callback: (payload: T) => void) {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) =>
    callback(payload);

  ipcRenderer.on(channel, listener);

  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("api", {
  sync: {
    enqueue: (op: Operation) => ipcRenderer.invoke("sync:enqueue", op),
    dequeue: (localId: string) => ipcRenderer.invoke("sync:dequeue", localId),
    setStatus: (localId: string, status: string) =>
      ipcRenderer.invoke("sync:setStatus", localId, status),
    incrementRetry: (localId: string) =>
      ipcRenderer.invoke("sync:incrementRetry", localId),
    markFailed: (localId: string) =>
      ipcRenderer.invoke("sync:markFailed", localId),
    clearFailed: () => ipcRenderer.invoke("sync:clearFailed"),
    getAll: () => ipcRenderer.invoke("sync:getAll"),
  },
  net: {
    checkStatus: () => ipcRenderer.invoke("net:checkStatus"),
  },
  app: {
    getInfo: () => ipcRenderer.invoke("app:getInfo"),
  },
  updater: {
    check: () => ipcRenderer.invoke("update:check"),
    install: () => ipcRenderer.invoke("update:install"),
    onChecking: (callback: () => void) =>
      subscribe("update:checking", callback),
    onAvailable: (callback: (version: string) => void) =>
      subscribe("update:available", callback),
    onNotAvailable: (callback: () => void) =>
      subscribe("update:not-available", callback),
    onProgress: (
      callback: (progress: {
        percent: number;
        transferred: number;
        total: number;
      }) => void,
    ) => subscribe("update:progress", callback),
    onDownloaded: (callback: () => void) =>
      subscribe("update:downloaded", callback),
    onError: (callback: (message: string) => void) =>
      subscribe("update:error", callback),
  },
});
