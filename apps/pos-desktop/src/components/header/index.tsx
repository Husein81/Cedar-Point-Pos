import { useAuthStore } from "@/store/authStore";
import { Button, cn, Icon } from "@repo/ui";
import { Activity, useId } from "react";
import { BranchSelector } from "../common";
import LeftSide from "./left-side";
import { frameActions } from "./config";

export function Header() {
  const { user } = useAuthStore();

  return (
    <header className="bg-sidebar pl-2 border-b z-50 fixed top-0 inset-x-0 h-10 flex items-center justify-between window-drag">
      <LeftSide />

      <div className="flex items-center gap-4">
        <Activity mode={user?.tenant?.name ? "visible" : "hidden"}>
          <span className="text-sm font-heading">{user?.tenant?.name}</span>
        </Activity>

        <Activity mode={user?.tenantId ? "visible" : "hidden"}>
          <div className="no-drag">
            <BranchSelector />
          </div>
        </Activity>
      </div>

      <div className="flex items-center h-full no-drag">
        {frameActions.map((action) => (
          <Button
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
