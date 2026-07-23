import { useAuthStore } from "@/store/authStore";
import { Button } from "@repo/ui";
import { useEffect, useState } from "react";
import { useOptionalDrawer } from "../layouts/client-layout";

const formatNow = () =>
  new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

const LeftSide = () => {
  const { isAuthenticated } = useAuthStore();
  const drawer = useOptionalDrawer();

  const [currentTime, setCurrentTime] = useState(formatNow);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(formatNow());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-4">
      {isAuthenticated && drawer ? (
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
      ) : null}

      <div className="text-xs text-muted-foreground font-mono">
        {currentTime}
      </div>
    </div>
  );
};

export default LeftSide;
