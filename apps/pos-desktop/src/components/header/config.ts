type FrameAction = {
  id: string;
  name: string;
  className: string;
  icon: string;
  onClick: () => void;
};

export const frameActions: FrameAction[] = [
  {
    id: "minimize",
    name: "MINIMIZE",
    className: "bg-transparent h-full w-13 rounded-none hover:bg-gray-400/70",
    icon: "Minus",
    onClick: () => window.electron?.sendFrameAction("MINIMIZE"),
  },
  {
    id: "maximize",
    name: "MAXIMIZE",
    className: "bg-transparent h-full w-13 rounded-none hover:bg-gray-400/70",
    icon: "OverlapSquare",
    onClick: () => window.electron?.sendFrameAction("MAXIMIZE"),
  },

  {
    id: "close",
    name: "CLOSE",
    className: "bg-transparent h-full w-13 rounded-none hover:bg-red-600",
    icon: "X",
    onClick: () => window.electron?.sendFrameAction("CLOSE"),
  },
];
