import { Button, Icon, Shad } from "@repo/ui";

interface HoldOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  orderLabel?: string;
}

export const HoldOrderDialog = ({
  open,
  onOpenChange,
  onConfirm,
  orderLabel = "this order",
}: HoldOrderDialogProps) => {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Shad.Dialog open={open} onOpenChange={onOpenChange}>
      <Shad.DialogContent className="sm:max-w-md">
        <Shad.DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10">
              <Icon name="CirclePause" className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <Shad.DialogTitle>Hold Order</Shad.DialogTitle>
            </div>
          </div>
          <Shad.DialogDescription className="pt-2">
            You are about to put <strong>{orderLabel}</strong> on hold.
          </Shad.DialogDescription>
        </Shad.DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Info Section */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex gap-3">
              <Icon
                name="Info"
                className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"
              />
              <div className="space-y-2 text-sm">
                <p className="font-medium">
                  What happens when you hold an order:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>The order will be saved and moved to a held state</li>
                  <li>You can resume it anytime from the order tabs</li>
                  <li>All items and discounts will be preserved</li>
                  <li>
                    The held order tab will show a{" "}
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                      Hold
                    </span>{" "}
                    badge
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Tip */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Icon name="Lightbulb" className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Use hold orders when a customer needs time to decide or is waiting
              for someone else to join.
            </p>
          </div>
        </div>

        <Shad.DialogFooter className="pt-4 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleConfirm}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Icon name="CirclePause" className="w-4 h-4" />
            Hold Order
          </Button>
        </Shad.DialogFooter>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
