import { useLogout } from "@/hooks/auth";
import { useAuthStore } from "@/store/authStore";
import { AUTH_ROUTE } from "@/constants/auth";
import { Button } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useOptionalDrawer } from "../layouts/client-layout";

const LeftSide = () => {
  const navigate = useNavigate();

  const { user, isAuthenticated } = useAuthStore();
  const drawer = useOptionalDrawer();

  const logoutMutation = useLogout();

  const [currentTime, setCurrentTime] = useState(
    format(new Date(), "p  MMM dd yyyy"),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(format(new Date(), "p dd MMM yyyy"));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-4">
      {isAuthenticated && drawer && user?.role !== "KITCHEN" ? (
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            iconName="Menu"
            onClick={(e) => {
              (e as React.MouseEvent<HTMLButtonElement>).currentTarget.blur();
              drawer.setOpen(true);
            }}
            className="no-drag"
          />
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
              navigate({ to: AUTH_ROUTE });
            }}
            className="no-drag"
          />
          <div className="h-10 border" />
        </>
      ) : undefined}

      <div className="text-xs text-muted-foreground font-mono">
        {currentTime}
      </div>
    </div>
  );
};

export default LeftSide;
