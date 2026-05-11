import type { TableWithFloor } from "@/dto/tables.dto";
import { useDeleteTable, useUpdateTableStatus } from "@/hooks/useTable";
import { useModalStore } from "@/store/modalStore";
import { TableStatus } from "@repo/types";
import { SButton, Icon, Shad, cn } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import React, { useCallback, useState } from "react";
import { TableActiveOrdersDialog } from "./TableActiveOrdersDialog";
import { TableForm } from "./TableForm";
import { STATUS_OPTIONS, TABLE_STATUS_CONFIG, statusColors } from "./config";

interface TableCardProps {
  table: TableWithFloor;
}

export function TableCard({ table }: TableCardProps) {
  const { openModal } = useModalStore();
  const knownStatuses = Object.values(TableStatus) as string[];
  const status: TableStatus = knownStatuses.includes(table.status)
    ? (table.status as TableStatus)
    : TableStatus.AVAILABLE;
  const navigate = useNavigate();

  const deleteTableMutation = useDeleteTable();
  const updateStatusMutation = useUpdateTableStatus();
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isActiveOrdersOpen, setIsActiveOrdersOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("[data-dropdown]")) {
      return;
    }

    if (status === "OCCUPIED") {
      setIsActiveOrdersOpen(true);
      return;
    }

    handleSeatTable();
  };

  const handleStatusChange = useCallback(
    (newStatus: TableStatus) => {
      if (newStatus === status) return;

      updateStatusMutation.mutate({
        id: table.id,
        status: newStatus,
      });
      setIsStatusDropdownOpen(false);
    },
    [updateStatusMutation, table.id, status],
  );

  const config = TABLE_STATUS_CONFIG[status] || TABLE_STATUS_CONFIG.AVAILABLE;

  return (
    <>
      <Shad.Card
        className={cn(
          "group relative overflow-hidden transition-all duration-300 cursor-pointer border-2",
          "hover:shadow-xl hover:-translate-y-1",
          statusColors[status],
          !table.isActive && "opacity-50 grayscale",
        )}
        onClick={handleCardClick}
      >
        {/* Background Pattern/Icon */}
        <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
          <Icon name="LayoutGrid" className="h-32 w-32 rotate-12" />
        </div>

        <div className="p-4 relative z-10">
          {/* Header: Actions */}
          <div className="flex items-start justify-between mb-2">
            <Shad.DropdownMenu
              open={isStatusDropdownOpen}
              onOpenChange={setIsStatusDropdownOpen}
            >
              <Shad.DropdownMenuTrigger asChild>
                <button
                  data-dropdown="true"
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all duration-200 border",
                    "shadow-sm hover:shadow-md active:scale-95",
                    config.className,
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative flex h-1.5 w-1.5">
                    <div
                      className={cn(
                        "absolute inset-0 rounded-full animate-pulse opacity-40",
                        status === "AVAILABLE"
                          ? "bg-emerald-500"
                          : status === "OCCUPIED"
                            ? "bg-red-500"
                            : "bg-purple-500",
                      )}
                    />
                    <div
                      className={cn(
                        "relative h-1.5 w-1.5 rounded-full",
                        status === "AVAILABLE"
                          ? "bg-emerald-500"
                          : status === "OCCUPIED"
                            ? "bg-red-500"
                            : "bg-purple-500",
                      )}
                    />
                  </div>
                  {config.label}
                  <Icon name="ChevronDown" className="h-3 w-3 opacity-50" />
                </button>
              </Shad.DropdownMenuTrigger>
              <Shad.DropdownMenuContent
                align="start"
                className="w-48"
                onClick={(e) => e.stopPropagation()}
              >
                <Shad.DropdownMenuLabel className="text-xs text-muted-foreground">
                  Quick Status
                </Shad.DropdownMenuLabel>
                <Shad.DropdownMenuSeparator />
                {STATUS_OPTIONS.map((option) => (
                  <Shad.DropdownMenuItem
                    key={option.value}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors",
                      "focus:bg-accent focus:text-accent-foreground",
                      option.value === status && "bg-accent/50 font-semibold",
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(option.value);
                    }}
                    disabled={
                      option.value === status || updateStatusMutation.isPending
                    }
                  >
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full ring-2 ring-offset-2 ring-transparent transition-all",
                        option.value === "AVAILABLE"
                          ? "bg-emerald-500"
                          : option.value === "OCCUPIED"
                            ? "bg-red-500"
                            : "bg-purple-500",
                        option.value === status &&
                          (option.value === "AVAILABLE"
                            ? "ring-emerald-500/30"
                            : option.value === "OCCUPIED"
                              ? "ring-red-500/30"
                              : "ring-purple-500/30"),
                      )}
                    />
                    <span className="flex-1">{option.label}</span>
                    {option.value === status && (
                      <Icon
                        name="Check"
                        className="h-4 w-4 text-primary animate-in zoom-in duration-200"
                      />
                    )}
                  </Shad.DropdownMenuItem>
                ))}
              </Shad.DropdownMenuContent>
            </Shad.DropdownMenu>

            <div className="flex gap-1">
              <Shad.DropdownMenu>
                <Shad.DropdownMenuTrigger asChild>
                  <SButton
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 transition-opacity bg-background/50 backdrop-blur-sm hover:bg-accent"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Icon name="Ellipsis" className="h-4 w-4" />
                  </SButton>
                </Shad.DropdownMenuTrigger>
                <Shad.DropdownMenuContent align="end" className="w-40">
                  {status === "AVAILABLE" && (
                    <Shad.DropdownMenuItem
                      onClick={handleSeatTable}
                      className="cursor-pointer"
                    >
                      <Icon name="UserPlus" className="mr-2 h-4 w-4" />
                      Seat Table
                    </Shad.DropdownMenuItem>
                  )}
                  <Shad.DropdownMenuItem
                    onClick={() => handleEditTable(table)}
                    className="cursor-pointer"
                  >
                    <Icon name="Pencil" className="mr-2 h-4 w-4" />
                    Edit Table
                  </Shad.DropdownMenuItem>
                  <Shad.DropdownMenuSeparator />
                  <Shad.DropdownMenuItem
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Icon name="Trash2" className="mr-2 h-4 w-4" />
                    Delete Table
                  </Shad.DropdownMenuItem>
                </Shad.DropdownMenuContent>
              </Shad.DropdownMenu>
            </div>
          </div>

          {/* Main Content: Table Number */}
          <div className="py-4 flex flex-col items-center justify-center">
            <span className="text-5xl font-black tracking-tighter text-foreground/90 group-hover:scale-110 transition-transform duration-300 inline-block">
              {table.tableNumber}
            </span>
            <p className="text-sm font-semibold text-muted-foreground mt-1 truncate max-w-full">
              {table.name}
            </p>
          </div>

          {/* Footer: Capacity & Floor */}
          <div className="mt-4 pt-3 border-t border-foreground/10 flex items-center justify-between">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-background/40 backdrop-blur-xs rounded-md border border-foreground/5 group-hover:bg-background/60 transition-colors">
              <Icon name="Users" className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] font-bold text-muted-foreground">
                {table.capacity}
              </span>
            </div>
            {table.floor && (
              <div className="flex items-center gap-1 px-2 py-1">
                <Icon
                  name="Building2"
                  className="h-3 w-3 text-muted-foreground/60"
                />
                <span className="text-[10px] font-medium text-muted-foreground/80">
                  {table.floor.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Hover Overlay */}
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </Shad.Card>

      {/* Dialogs */}
      <TableActiveOrdersDialog
        table={table}
        open={isActiveOrdersOpen}
        onOpenChange={setIsActiveOrdersOpen}
      />

      <Shad.AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <Shad.AlertDialogContent>
          <Shad.AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Icon name="Trash2" className="h-5 w-5" />
              </div>
              <Shad.AlertDialogTitle className="text-red-600">
                Delete Table "{table.name}"?
              </Shad.AlertDialogTitle>
            </div>
            <Shad.AlertDialogDescription className="mt-2">
              This will remove table "{table.name}" from your restaurant layout.
              This action cannot be undone.
            </Shad.AlertDialogDescription>
          </Shad.AlertDialogHeader>
          <Shad.AlertDialogFooter className="mt-4">
            <Shad.AlertDialogCancel asChild>
              <SButton variant="ghost">Cancel</SButton>
            </Shad.AlertDialogCancel>
            <Shad.AlertDialogAction asChild>
              <SButton
                variant="destructive"
                onClick={() => {
                  deleteTableMutation.mutate(table.id);
                  setIsDeleteDialogOpen(false);
                }}
              >
                Delete
              </SButton>
            </Shad.AlertDialogAction>
          </Shad.AlertDialogFooter>
        </Shad.AlertDialogContent>
      </Shad.AlertDialog>
    </>
  );
}
