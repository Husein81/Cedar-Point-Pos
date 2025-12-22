import { useAuthStore } from "@/store/authStore";
import { Button, cn, Icon } from "@repo/ui";
import { Activity, useId } from "react";
import logo from "/assets/logo.png";

export function Header() {
  const { user } = useAuthStore();
  const frameActions = [
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

  return (
    <header className="bg-sidebar pl-2 border-b z-50 fixed top-0 inset-x-0 h-10 flex items-center justify-between window-drag">
      <div className="flex items-center gap-3">
        <div className="flex items-center">
          <img src={logo} alt="point verse" width={24} height={24} />
          <h2 className="text-sm font-semibold text-text">
            Point <span className="text-primary">Verse</span>
          </h2>
        </div>
      </div>

      <Activity mode={user?.tenant?.name ? "visible" : "hidden"}>
        <span className="text-sm">{user?.tenant?.name}</span>
      </Activity>

      <div className="flex items-center h-full no-drag">
        {frameActions.map((action) => (
          <Button
            id={action.id}
            key={action.id}
            className={cn(action.className, "relative")}
            onClick={action.onClick}
          >
            {action.icon === "OverlapSquare" ? (
              <OverlapSquareIcon
                size={14}
                className="pointer-events-none text-text"
              />
            ) : (
              <Icon
                name={action.icon}
                className="pointer-events-none text-text"
              />
            )}
          </Button>
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
