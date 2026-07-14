import { ActiveTableOrder, TableOverview } from "@/dto/tables.dto";
import { OrderItem } from "@repo/types";
import { Badge, Icon, Skeleton } from "@repo/ui";
import { memo } from "react";
import { EmptyTab } from ".";
import { formatTableMoney } from "../config";

const latestTicketStatus = (item: OrderItem): string | null => {
  if (!item.tickets || item.tickets.length === 0) return null;
  const latest = [...item.tickets].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  )[0];
  return latest?.status ?? null;
};

export const OrderTab = memo(function OrderTab({
  summary,
  fullOrder,
  isLoading,
}: {
  summary: TableOverview["activeOrder"];
  fullOrder: ActiveTableOrder | null;
  isLoading: boolean;
}) {
  if (!summary) {
    return <EmptyTab icon="ReceiptText" text="No order on this table" />;
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const items = fullOrder?.items ?? [];

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {summary.itemCount} item{summary.itemCount === 1 ? "" : "s"} — order{" "}
          {summary.status === "PAID"
            ? "paid, awaiting clear"
            : "not editable here"}
          .
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const ticketStatus = latestTicketStatus(item);
            return (
              <li
                key={item.id}
                className="flex items-start justify-between gap-2 rounded-lg border p-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {item.quantity} × {item.product?.name ?? "Item"}
                  </p>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <p className="text-muted-foreground truncate text-xs">
                      {item.modifiers
                        .map((m) => m.modifier?.name)
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  {ticketStatus && (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      <Icon name="ChefHat" className="mr-1 h-3 w-3" />
                      {ticketStatus.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
                <span className="shrink-0 font-semibold">
                  {formatTableMoney(item.total)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
        <span>Total</span>
        <span>{formatTableMoney(summary.total)}</span>
      </div>
    </div>
  );
});
