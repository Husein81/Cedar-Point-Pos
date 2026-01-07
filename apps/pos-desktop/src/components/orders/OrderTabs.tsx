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

  const handleCloseTabRequest = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();

    // If tab has items, show confirmation
    if (hasUnsavedChanges(tabId)) {
      setTabToClose(tabId);
    } else {
      closeTab(tabId);
    }
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
      <div
        className={cn(
          "flex items-center gap-1 bg-muted/50 rounded-lg p-1 overflow-x-auto",
          className
        )}
      >
        {/* Order Tabs */}
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const hasItems = tab.order.items.length > 0;
          const isOnHold = tab.order.status === "ON_HOLD";

          return (
            <Button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              size="sm"
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "group flex items-center gap-2 min-w-0",
                isActive ? "font-semibold" : "font-medium"
              )}
            >
              {/* Tab Content */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span className="truncate text-sm font-medium">
                  {tab.label}
                </span>

                {/* Status indicators */}
                {isOnHold && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    Hold
                  </Badge>
                )}

                {/* Item count indicator */}
                {hasItems && !isOnHold && (
                  <span
                    className={cn(
                      "flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium rounded-full",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    )}
                  >
                    {tab.order.items.length}
                  </span>
                )}

                {/* Modified indicator (unsaved changes) */}
                {hasItems && (
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      isActive ? "bg-primary" : "bg-muted-foreground/50"
                    )}
                  />
                )}
              </div>

              {/* Close button - only show if more than 1 tab or has items */}
              {(tabs.length > 1 || hasItems) && (
                <button
                  onClick={(e) => handleCloseTabRequest(e, tab.id)}
                  className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-sm transition-colors",
                    "hover:bg-muted-foreground/20",
                    "opacity-0 group-hover:opacity-100 focus:opacity-100",
                    isActive && "opacity-60 group-hover:opacity-100"
                  )}
                  aria-label={`Close ${tab.label}`}
                >
                  <Icon name="X" className="w-4 h-4" />
                </button>
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
            className="h-8 w-8 shrink-0 hover:bg-background/50"
            aria-label="New order tab"
          >
            <Icon name="Plus" className="w-5 h-5" />
          </Button>
        )}
      </div>

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
