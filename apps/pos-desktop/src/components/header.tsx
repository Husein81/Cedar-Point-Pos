import { cn, Icon, SButton } from "@repo/ui";
import { useId } from "react";

export function Header() {
  const frameActions = [
    {
      id: "minimize",
      name: "MINIMIZE",
      className: "bg-transparent h-full w-13 rounded-none hover:bg-gray-400",
      icon: "Minus",
      onClick: () => window.electron?.sendFrameAction("MINIMIZE"),
    },
    {
      id: "maximize",
      name: "MAXIMIZE",
      className: "bg-transparent h-full w-13 rounded-none hover:bg-gray-400",
      icon: "OverlapSquare",
      onClick: () => window.electron?.sendFrameAction("MAXIMIZE"),
    },

    {
      id: "close",
      name: "CLOSE",
      className: "bg-transparent h-full w-13 rounded-none hover:bg-red-500",
      icon: "X",
      onClick: () => window.electron?.sendFrameAction("CLOSE"),
    },
  ];

  return (
    <header className="bg-[#040F2A]/90 h-10 flex items-center justify-between window-drag">
      <div className="flex items-center h-full px-3">
        <img src="/assets/logo.png" alt="" className="size-12" />
        <span className="text-xs font-medium text-gray-200">PointVerse</span>
      </div>
      <div className="flex items-center h-full no-drag">
        {frameActions.map((action) => (
          <SButton
            id={action.id}
            key={action.id}
            className={cn(action.className, "relative")}
            onClick={action.onClick}
          >
            {action.icon === "OverlapSquare" ? (
              <OverlapSquareIcon
                size={14}
                className="pointer-events-none text-gray-200"
              />
            ) : (
              <Icon
                name={action.icon}
                className="pointer-events-none text-gray-200"
              />
            )}
          </SButton>
        ))}
      </div>
    </header>
  );
}

const OverlapSquareIcon = ({
  size = 14,
  className,
  color,
}: {
  size?: string | number;
  className?: string;
  color?: string;
}) => {
  const maskId = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      className={className}
      style={{ color }}
    >
      <defs>
        <mask id={maskId}>
          <rect x="0" y="0" width="12" height="12" fill="white" />
          <rect x="3" y="3" width="6" height="6" fill="black" />
        </mask>
      </defs>

      {/* Back square (top-right) */}
      <rect
        x="4.5"
        y="1.5"
        width="6"
        height="6"
        rx="0.5"
        stroke="currentColor"
        strokeWidth="1"
        mask={`url(#${maskId})`}
      />

      {/* Front square (centered) */}
      <rect
        x="3"
        y="3"
        width="6"
        height="6"
        rx="0.5"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
};
