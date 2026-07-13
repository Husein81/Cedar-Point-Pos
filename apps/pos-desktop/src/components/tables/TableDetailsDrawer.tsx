import { memo, useMemo } from "react";
import { Badge, Icon, Shad, Skeleton, cn } from "@repo/ui";
import type { OrderItem } from "@repo/types";
import type { ActiveTableOrder, TableOverview } from "@/dto/tables.dto";
import { useActiveOrdersByTable } from "@/hooks/useTable";
import {
  TABLE_UI_STATUS_CONFIG,
  deriveTableUiStatus,
  formatElapsedSince,
  formatTableMoney,
  type TableUiStatusConfig,
} from "./config";
import { TableQuickActions } from "./TableQuickActions";
import type { TableNodeAction } from "./TableNode";
import { useElapsedNow } from "./useElapsedNow";
import { getTableDisplayName } from "./useTableActions";

interface TableDetailsDrawerProps {
  table: TableOverview | null;
  canManage: boolean;
  onClose: () => void;
  onAction: (table: TableOverview, action: TableNodeAction) => void;
}

interface DrawerHeaderProps {
  table: TableOverview;
  statusConfig: TableUiStatusConfig;
  summary: TableOverview["activeOrder"];
}

const DrawerHeader = memo(function DrawerHeader({
  table,
  statusConfig,
  summary,
}: DrawerHeaderProps) {
  const now = useElapsedNow();

  return (
    <Shad.SheetHeader className="border-b p-4 pb-3">
      <div className="flex items-start justify-between gap-3 pr-8">
        <div>
          <Shad.SheetTitle className="flex items-center gap-2 text-xl">
            Table {table.tableNumber}
            <Badge variant="outline" className={statusConfig.badge}>
              <Icon name={statusConfig.icon} className="mr-1 h-3 w-3" />
              {statusConfig.label}
            </Badge>
          </Shad.SheetTitle>
          <Shad.SheetDescription>
            {getTableDisplayName(table)}
          </Shad.SheetDescription>
        </div>
      </div>

      {/* Meta strip */}
      <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1">
          <Icon name="Users" className="h-3.5 w-3.5" />
          {summary?.guestCount ?? 0}/{table.capacity} guests
        </span>
        {summary && (
          <>
            <span className="flex items-center gap-1">
              <Icon name="Timer" className="h-3.5 w-3.5" />
              {formatElapsedSince(summary.createdAt, now)}
            </span>
            <span className={cn("font-semibold", statusConfig.text)}>
              {formatTableMoney(summary.total)}
            </span>
            {summary.userName && (
              <span className="flex items-center gap-1">
                <Icon name="UserCheck" className="h-3.5 w-3.5" />
                {summary.userName}
              </span>
            )}
          </>
        )}
      </div>
    </Shad.SheetHeader>
  );
});

/**
 * Right-side detail panel opened by selecting a table: header summary,
 * Overview / Order / Payments / Timeline tabs, and status-aware quick
 * actions. The full order (items, tickets, payments) is only fetched while
 * the drawer is open — the floor itself runs on the lightweight overview.
 * Memoized to prevent unnecessary re-renders; only the header re-renders
 * on the 30s time tick. Updates when table.id changes.
 */
export const TableDetailsDrawer = memo(
  function TableDetailsDrawer({
    table,
    canManage,
    onClose,
    onAction,
  }: TableDetailsDrawerProps) {
    const { data: activeOrders, isLoading: isLoadingOrder } =
      useActiveOrdersByTable(table?.id ?? null);

    const fullOrder = useMemo(() => {
      if (!activeOrders || activeOrders.length === 0) return null;
      return [...activeOrders].sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime(),
      )[0];
    }, [activeOrders]);

    if (!table) return null;

    const uiStatus = deriveTableUiStatus(table, table.activeOrder?.status);
    const statusConfig = TABLE_UI_STATUS_CONFIG[uiStatus];
    const summary = table.activeOrder;

    return (
      <Shad.Sheet open onOpenChange={(open) => !open && onClose()}>
        <Shad.SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <DrawerHeader
            table={table}
            statusConfig={statusConfig}
            summary={summary}
          />

          {/* Tabs */}
          <Shad.Tabs defaultValue="overview" className="flex  flex-1 flex-col">
            <Shad.TabsList className="mx-4 mt-3 w-auto">
              <Shad.TabsTrigger value="overview">Overview</Shad.TabsTrigger>
              <Shad.TabsTrigger value="order">Order</Shad.TabsTrigger>
              <Shad.TabsTrigger value="payments">Payments</Shad.TabsTrigger>
              <Shad.TabsTrigger value="timeline">Timeline</Shad.TabsTrigger>
            </Shad.TabsList>

            <Shad.ScrollArea className="min-h-0 flex-1 px-4">
              <Shad.TabsContent value="overview" className="space-y-1 py-3">
                <OverviewTab
                  table={table}
                  summary={summary}
                  uiStatus={uiStatus}
                />
              </Shad.TabsContent>

              <Shad.TabsContent value="order" className="py-3">
                <OrderTab
                  summary={summary}
                  fullOrder={fullOrder ?? null}
                  isLoading={isLoadingOrder}
                />
              </Shad.TabsContent>

              <Shad.TabsContent value="payments" className="py-3">
                <PaymentsTab summary={summary} fullOrder={fullOrder ?? null} />
              </Shad.TabsContent>

              <Shad.TabsContent value="timeline" className="py-3">
                <TimelineTab summary={summary} fullOrder={fullOrder ?? null} />
              </Shad.TabsContent>
            </Shad.ScrollArea>
          </Shad.Tabs>

          {/* Quick actions */}
          <Shad.SheetFooter className="border-t p-4">
            <TableQuickActions
              table={table}
              uiStatus={uiStatus}
              canManage={canManage}
              onAction={onAction}
            />
          </Shad.SheetFooter>
        </Shad.SheetContent>
      </Shad.Sheet>
    );
  },
  (prevProps, nextProps) => {
    // Re-render if table ID changes, or if canManage/callbacks change
    if (prevProps.table?.id !== nextProps.table?.id) return false;
    if (prevProps.canManage !== nextProps.canManage) return false;
    if (prevProps.onClose !== nextProps.onClose) return false;
    if (prevProps.onAction !== nextProps.onAction) return false;
    return true; // Props are equal, skip re-render
  },
);

interface OverviewTabProps {
  table: TableOverview;
  summary: TableOverview["activeOrder"];
  uiStatus: ReturnType<typeof deriveTableUiStatus>;
}

const OverviewTab = memo(function OverviewTab({
  table,
  summary,
  uiStatus,
}: OverviewTabProps) {
  const now = useElapsedNow();

  return (
    <div className="space-y-1">
      <OverviewRow label="Floor" value={table.floor?.name ?? "—"} />
      <OverviewRow label="Table name" value={table.name} />
      <OverviewRow label="Capacity" value={`${table.capacity} seats`} />
      <OverviewRow
        label="Guests"
        value={summary ? `${summary.guestCount ?? 0}` : "—"}
      />
      <OverviewRow label="Server" value={summary?.userName ?? "—"} />
      <OverviewRow label="Customer" value={summary?.customerName ?? "—"} />
      <OverviewRow label="Order #" value={summary?.orderNumber ?? "—"} />
      <OverviewRow
        label="Seated"
        value={
          summary ? `${formatElapsedSince(summary.createdAt, now)} ago` : "—"
        }
      />
      {uiStatus === "RESERVED" && (
        <p className="text-muted-foreground bg-muted/50 mt-3 rounded-lg p-3 text-xs">
          Reservation details (guest, time, countdown) are coming with the
          reservations module. For now RESERVED is a manual hold.
        </p>
      )}
    </div>
  );
});

function OverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] truncate text-right font-medium">
        {value}
      </span>
    </div>
  );
}

const latestTicketStatus = (item: OrderItem): string | null => {
  if (!item.tickets || item.tickets.length === 0) return null;
  const latest = [...item.tickets].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  )[0];
  return latest?.status ?? null;
};

const OrderTab = memo(function OrderTab({
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

const PaymentsTab = memo(function PaymentsTab({
  summary,
  fullOrder,
}: {
  summary: TableOverview["activeOrder"];
  fullOrder: ActiveTableOrder | null;
}) {
  if (!summary) {
    return <EmptyTab icon="CreditCard" text="No payments for this table" />;
  }

  const total = Number(summary.total);
  const paid = summary.paidAmount;
  const remaining = Math.max(0, total - paid);
  const payments = fullOrder?.payments ?? [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <PaymentStat label="Total" value={formatTableMoney(total)} />
        <PaymentStat
          label="Paid"
          value={formatTableMoney(paid)}
          className="text-emerald-600 dark:text-emerald-400"
        />
        <PaymentStat
          label="Remaining"
          value={formatTableMoney(remaining)}
          className={
            remaining > 0 ? "text-amber-600 dark:text-amber-400" : undefined
          }
        />
      </div>

      {payments.length > 0 && (
        <ul className="space-y-1.5">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="flex items-center justify-between rounded-lg border p-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <Icon
                  name="CreditCard"
                  className="text-muted-foreground h-4 w-4"
                />
                {payment.method}
                <span className="text-muted-foreground text-xs">
                  {new Date(payment.paidAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </span>
              <span className="font-medium">
                {formatTableMoney(payment.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

function PaymentStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg border p-2 text-center">
      <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
        {label}
      </p>
      <p className={cn("text-sm font-bold", className)}>{value}</p>
    </div>
  );
}

interface TimelineEvent {
  at: number;
  label: string;
  icon: string;
}

const TimelineTab = memo(function TimelineTab({
  summary,
  fullOrder,
}: {
  summary: TableOverview["activeOrder"];
  fullOrder: ActiveTableOrder | null;
}) {
  const events = useMemo<TimelineEvent[]>(() => {
    if (!summary) return [];
    const list: TimelineEvent[] = [
      {
        at: new Date(summary.createdAt).getTime(),
        label: "Guests seated · order created",
        icon: "Users",
      },
    ];

    if (fullOrder?.items) {
      let firstSent: number | null = null;
      let lastReady: number | null = null;
      for (const item of fullOrder.items) {
        for (const ticket of item.tickets ?? []) {
          const sent = new Date(ticket.sentAt).getTime();
          if (firstSent === null || sent < firstSent) firstSent = sent;
          if (ticket.bumpedAt) {
            const bumped = new Date(ticket.bumpedAt).getTime();
            if (lastReady === null || bumped > lastReady) lastReady = bumped;
          }
        }
      }
      if (firstSent !== null) {
        list.push({ at: firstSent, label: "Sent to kitchen", icon: "ChefHat" });
      }
      if (lastReady !== null) {
        list.push({ at: lastReady, label: "Kitchen ready", icon: "BellRing" });
      }
    }

    for (const payment of fullOrder?.payments ?? []) {
      list.push({
        at: new Date(payment.paidAt).getTime(),
        label: `Payment · ${payment.method} ${formatTableMoney(payment.amount)}`,
        icon: "CreditCard",
      });
    }

    return list
      .filter((e) => Number.isFinite(e.at))
      .sort((a, b) => a.at - b.at);
  }, [fullOrder, summary]);

  if (events.length === 0) {
    return <EmptyTab icon="History" text="No activity yet" />;
  }

  return (
    <ol className="relative ml-2 space-y-4 border-l pl-5">
      {events.map((event, index) => (
        <li key={`${event.at}-${index}`} className="relative">
          <span className="bg-card absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full border">
            <Icon name={event.icon} className="text-muted-foreground h-3 w-3" />
          </span>
          <p className="text-sm font-medium">{event.label}</p>
          <p className="text-muted-foreground text-xs">
            {new Date(event.at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </li>
      ))}
    </ol>
  );
});

const EmptyTab = memo(function EmptyTab({
  icon,
  text,
}: {
  icon: string;
  text: string;
}) {
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-sm">
      <Icon name={icon} className="h-8 w-8 opacity-40" />
      {text}
    </div>
  );
});
