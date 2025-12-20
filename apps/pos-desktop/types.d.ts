type UnsubscribeFunction = () => void;
type FrameWindowAction = "CLOSE" | "MAXIMIZE" | "MINIMIZE";

interface Window {
  electron: {
    subscribeStatistics: (
      callback: (statistics: Statistics) => void
    ) => UnsubscribeFunction;
    subscribeChangeView: (
      callback: (view: View) => void
    ) => UnsubscribeFunction;
    sendFrameAction: (payload: FrameWindowAction) => void;
  };
}
