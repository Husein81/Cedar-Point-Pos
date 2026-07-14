type UnsubscribeFunction = () => void;
type FrameWindowAction = "CLOSE" | "MAXIMIZE" | "MINIMIZE";

type AppInfo = {
  version: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  isPackaged: boolean;
};

type UpdateProgress = {
  percent: number;
  transferred: number;
  total: number;
};

interface Window {
  electron: {
    sendFrameAction: (payload: FrameWindowAction) => void;
  };
  api: {
    sync: {
      enqueue: (op: any) => Promise<void>;
      dequeue: (localId: string) => Promise<void>;
      setStatus: (localId: string, status: string) => Promise<void>;
      incrementRetry: (localId: string) => Promise<void>;
      markFailed: (localId: string) => Promise<void>;
      clearFailed: () => Promise<void>;
      getAll: () => Promise<any[]>;
    };
    net?: {
      checkStatus: () => Promis<{
        hasInterface: boolean;
        lookupSuccess: boolean;
      }>;
    };
    app?: {
      getInfo: () => Promise<AppInfo>;
    };
    updater?: {
      check: () => Promise<void>;
      install: () => Promise<void>;
      onChecking: (callback: () => void) => UnsubscribeFunction;
      onAvailable: (callback: (version: string) => void) => UnsubscribeFunction;
      onNotAvailable: (callback: () => void) => UnsubscribeFunction;
      onProgress: (
        callback: (progress: UpdateProgress) => void,
      ) => UnsubscribeFunction;
      onDownloaded: (callback: () => void) => UnsubscribeFunction;
      onError: (callback: (message: string) => void) => UnsubscribeFunction;
    };
  };
}

type Option = {
  label: string;
  value: string;
};
