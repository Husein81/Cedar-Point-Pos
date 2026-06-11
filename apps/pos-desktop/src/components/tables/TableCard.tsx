import { useNetworkStatus } from "@/context/NetworkContext";
import type { ServerOrderWithPayments } from "@/dto/order.dto";
import type { TableWithFloor } from "@/dto/tables.dto";
import { useActiveOrdersByTable, useDeleteTable } from "@/hooks/useTable";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { TableStatus } from "@repo/types";
import { Icon, SButton, cn, toast } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import React from "react";
import { AlertDialog } from "../common";
import { TableForm } from "./TableForm";
import TableStatusDropdown from "./TableStatusDropdown";

interface TableCardProps {
  table: TableWithFloor;
}

export function TableCard({ table }: TableCardProps) {
  const { openModal } = useModalStore();
  const { isOnline } = useNetworkStatus();

  const { data: activeOrders } = useActiveOrdersByTable(table.id);

  const knownStatuses = Object.values(TableStatus) as string[];
  const status: TableStatus = knownStatuses.includes(table.status)
    ? (table.status as TableStatus)
    : TableStatus.AVAILABLE;
  const navigate = useNavigate();

  const deleteTableMutation = useDeleteTable();
  const { loadOrder, createTabWithTable } = useOrderStore();

  const handleEditTable = (table: TableWithFloor) =>
    openModal("Edit Table", <TableForm table={table} />);

  const handleSeatTable = () => {
    navigate({
      to: "/",
      search: {
        tableId: table.id,
        tableName: table.floor
          ? `${table.floor.name} - ${table.name}`
          : table.name,
      },
    });
  };

  const handleCardClick = async (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("[data-dropdown]")) {
      return;
    }

    if (status === "OCCUPIED") {
      try {
        // Fetch active orders

        if (activeOrders && activeOrders.length > 0) {
          // Sort to find the latest order
          const sortedOrders = [...activeOrders].sort((a, b) => {
            const aAny = a as any;
            const bAny = b as any;
            const dateA = aAny.updatedAt
              ? new Date(aAny.updatedAt).getTime()
              : new Date(aAny.createdAt).getTime();
            const dateB = bAny.updatedAt
              ? new Date(bAny.updatedAt).getTime()
              : new Date(bAny.createdAt).getTime();
            return dateB - dateA; // Descending
          });

          const latestOrder = sortedOrders[0];

          const tabId = loadOrder(latestOrder as ServerOrderWithPayments);
          if (tabId) {
            navigate({
              to: "/",
              search: { tableId: table.id },
            });
          }
        } else {
          // Fallback
          handleSeatTable();
        }
      } catch (error) {
        toast.error("Failed to load active order");
        console.error(error);
      }
      return;
    }

    const tableName = table.floor
      ? `${table.floor.name} - ${table.name}`
      : table.name;
    createTabWithTable(table.id, tableName);
    handleSeatTable();
  };

  return (
    <div className={cn("relative group-hover:-translate-y-0.5")}>
      <div
        className={cn(
          "group relative w-full h-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg transition-all duration-300 cursor-pointer shadow-xs",
          "hover:shadow-lg dark:hover:shadow-slate-950/40 hover:-translate-y-0.5",
          !table.isActive && "opacity-50 grayscale",
        )}
        onClick={handleCardClick}
      >
        <div className="p-6 h-full flex flex-col justify-between relative z-10">
          {/* Header Row */}
          <div className="flex justify-between items-start">
            {/* Table Number */}
            <span className="text-5xl font-black tracking-tighter text-slate-800 dark:text-slate-100 leading-none">
              {table.tableNumber}
            </span>

            {/* Action buttons (fade/scale in on hover) */}
            <div
              className={cn(
                "flex gap-1 bg-background dark:bg-slate-800 border border-blue-100 dark:border-slate-700/50 rounded-lg p-1 shadow-xs transition-all duration-300",
                "scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <SButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditTable(table);
                }}
                variant={"ghost"}
                size={"icon-sm"}
                disabled={!isOnline}
              >
                <Icon name="Pencil" className="h-4 w-4" />
              </SButton>
              <SButton
                variant={"ghost"}
                size={"icon-sm"}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSeatTable();
                }}
              >
                <Icon name="ShoppingCart" className="h-4 w-4" />
              </SButton>
            </div>
          </div>

          {/* Details Column */}
          <div className="flex flex-col items-start mt-2">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate max-w-full leading-snug">
              {table.name}
            </h3>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
              {table.capacity} Guests
            </span>
          </div>

          {/* Bottom Row */}
          <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between w-full">
            {/* Status Dropdown Triggered by the Status Badge */}
            <TableStatusDropdown tableId={table.id} status={status} />

            <AlertDialog
              title={`Delete Table ${table.name}`}
              description={` This will remove table ${table.name} from your restaurant layout.
          This action cannot be undone.`}
              iconButton="Trash2"
              onConfirm={() => deleteTableMutation.mutate(table.id)}
              variant="delete"
              buttonVariant="destructive"
              className="size-8"
              disabled={!isOnline}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
