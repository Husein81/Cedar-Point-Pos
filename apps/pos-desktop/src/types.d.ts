type UnsubscribeFunction = () => void;
type FrameWindowAction = "CLOSE" | "MAXIMIZE" | "MINIMIZE";

interface Window {
  electron: {
    sendFrameAction: (payload: FrameWindowAction) => void;
  };
}
