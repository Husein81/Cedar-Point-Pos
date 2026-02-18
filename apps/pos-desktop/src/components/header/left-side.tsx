import { useLogout } from "@/hooks/auth";
import { useAuthStore } from "@/store/authStore";
import { useBranchStore } from "@/store/branchStore";
import { useShiftStore } from "@/store/shiftStore";
import { useCurrentShift } from "@/hooks/useShifts";
import { Badge, Button } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import logo from "/assets/logo.png";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useOptionalDrawer } from "../layouts/client-layout";

const LeftSide = () => {
  const navigate = useNavigate();

  const { user, isAuthenticated } = useAuthStore();
  const { branchId } = useBranchStore();
  const { currentDeviceId } = useShiftStore();
  const drawer = useOptionalDrawer();

  const { data: currentShift } = useCurrentShift(
    currentDeviceId ?? undefined,
    branchId ?? undefined,
  );
  const isShiftOpen = currentShift?.status === "OPEN";

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
      drawer &&
      user?.role !== "CASHIER" &&
      user?.role !== "KITCHEN" ? (
        <>
          <Button
            variant="ghost"
            size="icon"
            iconName="Menu"
            onClick={() => drawer.setOpen(true)}
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
      {isAuthenticated && (
        <Badge
          variant={isShiftOpen ? "default" : "secondary"}
          className="text-[10px] px-2 py-0.5 cursor-pointer"
          onClick={() => navigate({ to: "/shifts" })}
        >
          {isShiftOpen ? "Shift Open" : "No Shift"}
        </Badge>
      )}
    </div>
  );
};
export default LeftSide;
