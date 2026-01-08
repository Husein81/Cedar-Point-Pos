import { Badge, Button, Icon, Shad } from "@repo/ui";
import { useOrderStore } from "@/store/orderStore";
import { cn } from "@repo/ui";
import { useState } from "react";

interface OrderTabsProps {
  className?: string;
}

export const OrderTabs = ({ className }: OrderTabsProps) => {
  const {
    tabs,
    activeTabId,
    setActiveTab,
    createTab,
    closeTab,
    canCreateNewTab,
    hasUnsavedChanges,
  } = useOrderStore();

  const [tabToClose, setTabToClose] = useState<string | null>(null);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleNewTab = () => {
    createTab();
  };

  const confirmCloseTab = () => {
    if (tabToClose) {
      closeTab(tabToClose);
      setTabToClose(null);
    }
  };

  const cancelCloseTab = () => {
    setTabToClose(null);
  };

  return (
    <>
      {/* Browser-style tab bar */}
      <div className={cn("flex items-end gap-0.5", className)}>
        {/* Order Tabs */}
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const hasItems = tab.order.items.length > 0;
          const isOnHold = tab.order.status === "ON_HOLD";

          return (
            <Button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              variant="ghost"
              className={cn(
                "group relative flex items-center gap-2 px-4 py-2 h-auto",
                "min-w-35 max-w-50",
                "rounded-t-lg rounded-b-none transition-all duration-150",
                "border border-b-0",
                isActive
                  ? "bg-background border-border text-foreground z-10"
                  : "bg-muted/20 border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                !isActive && "translate-y-px"
              )}
            >
              {/* Tab Content */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "truncate text-sm",
                    isActive ? "font-medium text-primary" : "font-normal"
                  )}
                >
                  {tab.label}
                </span>

                {isOnHold && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    Hold
                  </Badge>
                )}

                {hasItems && !isOnHold && (
                  <span
                    className={cn(
                      "flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-medium rounded-full",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    )}
                  >
                    {tab.order.items.length}
                  </span>
                )}
              </div>

              {/* Close button */}
              {(tabs.length > 1 || hasItems) && (
                <Button
                  onClick={(e?: unknown) => {
                    if (e && typeof e === 'object' && 'stopPropagation' in e) {
                      (e as React.MouseEvent).stopPropagation();
                    }
                    if (hasUnsavedChanges(tab.id)) {
                      setTabToClose(tab.id);
                    } else {
                      closeTab(tab.id);
                    }
                  }}
                  className={cn(
                    "flex items-center justify-center w-5 h-5 rounded-sm transition-opacity",
                    "hover:bg-muted-foreground/20",
                    isActive
                      ? "opacity-60 hover:opacity-100"
                      : "opacity-40 group-hover:opacity-60 group-hover:hover:opacity-100"
                  )}
                  variant="ghost"
                  aria-label={`Close ${tab.label}`}
                >
                  <Icon name="X" className="w-3.5 h-3.5" />
                </Button>
              )}
            </Button>
          );
        })}

        {/* New Tab Button */}
        {canCreateNewTab() && (
          <Button
            onClick={handleNewTab}
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-1 text-muted-foreground hover:text-foreground"
            aria-label="New order tab"
          >
            <Icon name="Plus" className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Tab content connection line */}
      <div className="h-px bg-border -mt-px" />

      {/* Close Confirmation Dialog */}
      <Shad.AlertDialog
        open={tabToClose !== null}
        onOpenChange={(open) => !open && cancelCloseTab()}
      >
        <Shad.AlertDialogContent>
          <Shad.AlertDialogHeader>
            <Shad.AlertDialogTitle>Close Order?</Shad.AlertDialogTitle>
            <Shad.AlertDialogDescription>
              This order has items that haven't been saved. Closing this tab
              will discard all items. Are you sure you want to continue?
            </Shad.AlertDialogDescription>
          </Shad.AlertDialogHeader>
          <Shad.AlertDialogFooter>
            <Shad.AlertDialogCancel onClick={cancelCloseTab}>
              Cancel
            </Shad.AlertDialogCancel>
            <Shad.AlertDialogAction
              onClick={confirmCloseTab}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard & Close
            </Shad.AlertDialogAction>
          </Shad.AlertDialogFooter>
        </Shad.AlertDialogContent>
      </Shad.AlertDialog>
    </>
  );
};
