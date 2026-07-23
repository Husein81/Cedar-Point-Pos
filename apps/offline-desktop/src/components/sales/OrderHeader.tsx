import { useKeypadStore } from "@/store/keypadStore";
import { useOrderStore } from "@/store/orderStore";
import { Button, Icon } from "@repo/ui";
import { CustomerSelector } from "./CustomerSelector";

/** Cart header: order identity and customer binding. */
export const OrderHeader = () => {
  const { closeKeypad } = useKeypadStore();
  const { getActiveOrder, clearOrder } = useOrderStore();

  const order = getActiveOrder();
  const items = order?.items ?? [];

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-muted/30 px-3 py-2">
      {/* Identity row */}
      <div className="flex items-center gap-2">
        <Icon name="ShoppingCart" className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Order</h2>
        {items.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
            {items.length}
          </span>
        )}

        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearOrder();
              closeKeypad();
            }}
            className="ml-auto h-7 rounded-sm text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Icon name="Trash2" className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      <CustomerSelector />
    </div>
  );
};
