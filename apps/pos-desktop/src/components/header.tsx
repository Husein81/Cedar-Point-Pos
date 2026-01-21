import { useAuthStore } from "@/store/authStore";
import { Button, cn, Icon, Shad } from "@repo/ui";
import { format } from "date-fns";
import { Activity, useEffect, useId, useState } from "react";
import { BranchSelector } from "./common";
import logo from "/assets/logo.png";
import { useLogout } from "@/hooks/auth";
import { useNavigate } from "@tanstack/react-router";

export function Header() {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const logoutMutation = useLogout();

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

  const [currentTime, setCurrentTime] = useState(
    format(new Date(), "p dd MMM yyyy")
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(format(new Date(), "p dd MMM yyyy"));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-sidebar pl-2 border-b z-50 fixed top-0 inset-x-0 h-10 flex items-center justify-between window-drag">
      <div className="flex items-center gap-4">
        {isAuthenticated && user?.role !== "CASHIER" ? (
          <>
            <Shad.SidebarTrigger className="no-drag" />
            <div className="h-10 border" />
          </>
        ) : isAuthenticated ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              iconName="LogOut"
              onClick={async () => {
                await logoutMutation.mutateAsync();
                navigate({ to: "/auth" });
              }}
              className=" no-drag"
            />
            <div className="h-10 border" />
          </>
        ) : undefined}

        <div className="flex items-center">
          <img src={logo} alt="point verse" width={24} height={24} />
          <h2 className="text-sm font-semibold text-text">
            Point <span className="text-primary">Verse</span>
          </h2>
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          {currentTime}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Activity mode={user?.tenant?.name ? "visible" : "hidden"}>
          <span className="text-sm font-heading">{user?.tenant?.name}</span>
        </Activity>

        {user?.tenantId && (
          <div className="no-drag">
            <BranchSelector />
          </div>
        )}
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
