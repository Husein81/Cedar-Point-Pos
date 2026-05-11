import { Badge, Button, Icon, Shad } from "@repo/ui";
import { useOrderStore } from "@/store/orderStore";
import { cn } from "@repo/ui";
import { useState } from "react";

type Props = {
  className?: string;
  leftElement?: React.ReactNode;
};

export const OrderTabs = ({ className, leftElement }: Props) => {
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

  return (
    <>
      <Shad.TooltipProvider>
        {/* Tabs Container */}
        <div className={cn("flex items-end gap-1 px-1 pt-1 bg-muted/30")}>
          {leftElement}

          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const hasItems = tab.order.items.length > 0;
            const isOnHold = tab.order.status === "ON_HOLD";
            const isDirty = hasUnsavedChanges(tab.id);

            return (
              <Shad.Tooltip key={tab.id}>
                <Shad.TooltipTrigger asChild>
                  <div
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "group relative flex items-center gap-2 px-3 h-8 cursor-pointer",
                      "flex-1 min-w-0 max-w-55 hover:bg-background hover:text-foreground",
                      "rounded-t-lg rounded-b-none border transition-all duration-150 border-b-0",
                      isActive
                        ? [
                            "bg-background text-foreground",
                            "border-border border-b-background",
                            "z-20",
                          ]
                        : [
                            "bg-muted/40 text-muted-foreground",
                            "border-transparent border-b-0",
                            "hover:bg-muted/70 hover:text-foreground translate-y-px",
                            "z-10",
                          ],
                    )}
                  >
                    {/* Label + Meta */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={cn(
                          "truncate text-sm",
                          isActive ? "font-medium" : "font-normal",
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
                            "min-w-4 h-4 px-1 text-[10px] font-medium rounded-full flex items-center justify-center",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "bg-muted-foreground/20 text-muted-foreground",
                          )}
                        >
                          {tab.order.items.length}
                        </span>
                      )}

                      {/* Unsaved dot */}
                      {isDirty && (
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      )}
                    </div>

                    {/* Close */}
                    {(tabs.length > 1 || hasItems) && (
                      <Icon
                        name="X"
                        className="w-3.5 h-3.5 hover:text-grey-400"
                        onClick={(e?: unknown) => {
                          if (
                            e &&
                            typeof e === "object" &&
                            "stopPropagation" in e
                          ) {
                            (e as React.MouseEvent).stopPropagation();
                          }
                          if (hasUnsavedChanges(tab.id)) {
                            setTabToClose(tab.id);
                          } else {
                            closeTab(tab.id);
                          }
                        }}
                      />
                    )}
                  </div>
                </Shad.TooltipTrigger>
                <Shad.TooltipContent side="top" className="z-50">
                  <div className="flex flex-col gap-0.5">
                    <p className="font-medium">{tab.label}</p>
                    {hasItems && (
                      <p className="text-xs text-muted-foreground">
                        {tab.order.items.length} items
                      </p>
                    )}
                  </div>
                </Shad.TooltipContent>
              </Shad.Tooltip>
            );
          })}

          {/* New Tab */}
          {canCreateNewTab() && (
            <Shad.Tooltip>
              <Shad.TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={createTab}
                  className="size-8 text-muted-foreground hover:text-background"
                >
                  <Icon name="Plus" className="w-4 h-4 dark:text-foreground" />
                </Button>
              </Shad.TooltipTrigger>
              <Shad.TooltipContent side="top">
                <p>New Draft Order</p>
              </Shad.TooltipContent>
            </Shad.Tooltip>
          )}
        </div>
      </Shad.TooltipProvider>

      {/* Tab content connection line */}
      <div className="h-px bg-border -mt-px" />

      {/* Close Confirmation Dialog */}
      <Shad.AlertDialog
        open={tabToClose !== null}
        onOpenChange={(open) => !open && setTabToClose(null)}
      >
        <Shad.AlertDialogContent>
          <Shad.AlertDialogHeader>
            <Shad.AlertDialogTitle>Discard Order?</Shad.AlertDialogTitle>
            <Shad.AlertDialogDescription>
              This order contains unsaved items. Closing it will permanently
              discard them.
            </Shad.AlertDialogDescription>
          </Shad.AlertDialogHeader>

          <Shad.AlertDialogFooter>
            <Shad.AlertDialogCancel onClick={() => setTabToClose(null)}>
              Cancel
            </Shad.AlertDialogCancel>
            <Shad.AlertDialogAction
              onClick={() => {
                if (tabToClose) closeTab(tabToClose);
                setTabToClose(null);
              }}
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
