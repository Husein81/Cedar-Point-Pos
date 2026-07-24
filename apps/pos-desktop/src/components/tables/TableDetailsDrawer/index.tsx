import type { TableOverview } from "@/dto/tables.dto";
import type { Reservation } from "@/dto/reservation.dto";
import { useActiveOrdersByTable } from "@/hooks/useTable";
import { useTableReservations } from "@/hooks/useReservations";
import { useBaseCurrency } from "@/hooks/useCurrency";
import { formatReservationCountdown } from "@/components/reservations/reservationStatus";
import { Badge, Icon, Shad, cn } from "@repo/ui";
import { ACTIVE_RESERVATION_STATUSES } from "@repo/types";
import { memo, useMemo } from "react";
import {
  OVER_CAPACITY_TEXT_CLASS,
  TABLE_UI_STATUS_CONFIG,
  deriveTableUiStatus,
  formatElapsedSince,
  isOverCapacity,
  type TableUiStatusConfig,
} from "../config";
import { useElapsedNow } from "../hooks/useElapsedNow";
import { getTableDisplayName } from "../hooks/useTableActions";
import type { TableNodeAction } from "../TableNode";
import { TableQuickActions } from "../TableQuickActions";
import { OrderTab } from "./OrderTab";
import { OverviewTab } from "./Overview";
import { PaymentsTab } from "./PaymentsTab";
import { ReservationsTab } from "./ReservationsTab";
import { TimelineTab } from "./TimelineTab";

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
  uiStatus: string;
  nextReservation: Reservation | null;
}

const DrawerHeader = memo(function DrawerHeader({
  table,
  statusConfig,
  summary,
  uiStatus,
  nextReservation,
}: DrawerHeaderProps) {
  const now = useElapsedNow();
  const { format: formatMoney } = useBaseCurrency();

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
        <span
          className={cn(
            "flex items-center gap-1",
            isOverCapacity(summary?.guestCount, table.capacity) &&
              cn(OVER_CAPACITY_TEXT_CLASS, "font-semibold"),
          )}
        >
          <Icon name="Users" className="h-3.5 w-3.5" />
          {summary?.guestCount ?? 0}/{table.capacity} guests
          {isOverCapacity(summary?.guestCount, table.capacity) && (
            <Icon name="TriangleAlert" className="h-3.5 w-3.5" />
          )}
        </span>
        {summary && (
          <>
            <span className="flex items-center gap-1">
              <Icon name="Timer" className="h-3.5 w-3.5" />
              {formatElapsedSince(summary.createdAt, now)}
            </span>
            <span className={cn("font-semibold", statusConfig.text)}>
              {formatMoney(summary.total)}
            </span>
            {summary.userName && (
              <span className="flex items-center gap-1">
                <Icon name="UserCheck" className="h-3.5 w-3.5" />
                {summary.userName}
              </span>
            )}
            {summary.customerName && (
              <span className="flex items-center gap-1">
                <Icon name="User" className="h-3.5 w-3.5" />
                {summary.customerName}
                {summary.additionalCustomerNames &&
                  summary.additionalCustomerNames.length > 0 &&
                  ` +${summary.additionalCustomerNames.length}`}
              </span>
            )}
          </>
        )}
      </div>

      {/* Reserved-state banner: who's expected and how soon. */}
      {uiStatus === "RESERVED" && nextReservation && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs dark:border-orange-500/20 dark:bg-orange-500/10">
          <div className="flex items-center gap-1.5 text-orange-800 dark:text-orange-300">
            <Icon name="CalendarClock" className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">
              {nextReservation.customerName}
            </span>
            <span>· {nextReservation.guestCount} guests</span>
          </div>
          <span className="font-semibold text-orange-700 dark:text-orange-300">
            {formatReservationCountdown(nextReservation.reservationAt, now)}
          </span>
        </div>
      )}
    </Shad.SheetHeader>
  );
});

export const TableDetailsDrawer = memo(
  function TableDetailsDrawer({
    table,
    canManage,
    onClose,
    onAction,
  }: TableDetailsDrawerProps) {
    const { data: activeOrders, isLoading: isLoadingOrder } =
      useActiveOrdersByTable(table?.id ?? null);
    const { data: tableReservations = [] } = useTableReservations(
      table?.id ?? null,
    );

    const nextReservation = useMemo(() => {
      const activeStatuses = new Set<string>(ACTIVE_RESERVATION_STATUSES);
      const upcoming = tableReservations
        .filter((r) => activeStatuses.has(r.status))
        .sort(
          (a, b) =>
            new Date(a.reservationAt).getTime() -
            new Date(b.reservationAt).getTime(),
        );
      return upcoming[0] ?? null;
    }, [tableReservations]);

    const fullOrder = useMemo(() => {
      if (!activeOrders || activeOrders.length === 0) return null;
      return [...activeOrders].sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime(),
      )[0];
    }, [activeOrders]);

    if (!table) return null;

    const uiStatus = deriveTableUiStatus(
      table,
      table.activeOrder?.status,
      table.activeOrder?.paymentStatus,
    );
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
            uiStatus={uiStatus}
            nextReservation={nextReservation}
          />

          {/* Tabs */}
          <Shad.Tabs defaultValue="overview" className="flex  flex-1 flex-col">
            <Shad.TabsList className="mx-4 mt-3 w-auto">
              <Shad.TabsTrigger value="overview">Overview</Shad.TabsTrigger>
              <Shad.TabsTrigger value="order">Order</Shad.TabsTrigger>
              <Shad.TabsTrigger value="reservations">
                Reservations
              </Shad.TabsTrigger>
              <Shad.TabsTrigger value="payments">Payments</Shad.TabsTrigger>
              <Shad.TabsTrigger value="timeline">Timeline</Shad.TabsTrigger>
            </Shad.TabsList>

            <Shad.ScrollArea className="min-h-0 flex-1 px-4">
              <Shad.TabsContent value="overview" className="space-y-1 py-3">
                <OverviewTab
                  table={table}
                  summary={summary}
                  uiStatus={uiStatus}
                  nextReservation={nextReservation}
                />
              </Shad.TabsContent>

              <Shad.TabsContent value="order" className="py-3">
                <OrderTab
                  summary={summary}
                  fullOrder={fullOrder ?? null}
                  isLoading={isLoadingOrder}
                />
              </Shad.TabsContent>

              <Shad.TabsContent value="reservations" className="py-3">
                <ReservationsTab table={table} />
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

export const EmptyTab = memo(function EmptyTab({
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
