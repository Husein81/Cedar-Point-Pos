// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  sendFrameAction: (action: "MINIMIZE" | "MAXIMIZE" | "CLOSE") => {
    ipcRenderer.send("frame-action", action);
  },
});

contextBridge.exposeInMainWorld("api", {
  sync: {
    enqueue: (op: any) => ipcRenderer.invoke("sync:enqueue", op),
    dequeue: (localId: string) => ipcRenderer.invoke("sync:dequeue", localId),
    setStatus: (localId: string, status: string) => ipcRenderer.invoke("sync:setStatus", localId, status),
    incrementRetry: (localId: string) => ipcRenderer.invoke("sync:incrementRetry", localId),
    markFailed: (localId: string) => ipcRenderer.invoke("sync:markFailed", localId),
    clearFailed: () => ipcRenderer.invoke("sync:clearFailed"),
    getAll: () => ipcRenderer.invoke("sync:getAll"),
  },
});
