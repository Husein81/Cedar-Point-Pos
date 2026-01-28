import { useLogout } from "@/hooks/auth";
import { useAuthStore } from "@/store/authStore";
import { Button, Shad } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import logo from "/assets/logo.png";
import { useEffect, useState } from "react";
import { format } from "date-fns";

const LeftSide = () => {
  const navigate = useNavigate();

  const { user, isAuthenticated } = useAuthStore();

  const logoutMutation = useLogout();

  const [currentTime, setCurrentTime] = useState(
    format(new Date(), "p dd MMM yyyy"),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(format(new Date(), "p dd MMM yyyy"));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-4">
      {isAuthenticated &&
      user?.role !== "CASHIER" &&
      user?.role !== "KITCHEN" ? (
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
  );
};
export default LeftSide;
