type UnsubscribeFunction = () => void;
type FrameWindowAction = "CLOSE" | "MAXIMIZE" | "MINIMIZE";

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
  };
}

type Option = {
  label: string;
  value: string;
};
