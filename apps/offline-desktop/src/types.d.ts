import type {
  IpcChannel,
  IpcInput,
  IpcResult,
} from "./shared/ipc-contract";

export {};

declare global {
  interface Window {
    electron?: {
      sendFrameAction: (action: "MINIMIZE" | "MAXIMIZE" | "CLOSE") => void;
      getAppInfo: () => Promise<{
        version: string;
        electronVersion: string;
        chromeVersion: string;
        nodeVersion: string;
        platform: string;
        arch: string;
        isPackaged: boolean;
      }>;
    };
    ipc?: {
      invoke: <C extends IpcChannel>(
        channel: C,
        input: IpcInput<C>,
      ) => Promise<IpcResult<unknown>>;
    };
  }
}
