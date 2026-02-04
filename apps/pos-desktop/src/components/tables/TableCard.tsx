import { TableStatus } from "@repo/types";
import { Button, Shad, Icon, cn } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import React, { useCallback, useState } from "react";
import { TableStatusBadge } from "./TableStatusBadge";
import type { TableWithFloor } from "@/dto/tables.dto";
import { useDeleteTable, useUpdateTableStatus } from "@/hooks/useTable";
import { STATUS_OPTIONS, statusColors, statusIcons } from "./config";
import { useModalStore } from "@/store/modalStore";
import { TableForm } from "./TableForm";
import { AlertDialog } from "../common";

interface TableCardProps {
  table: TableWithFloor;
  onClick?: (table: TableWithFloor) => void;
}

export function TableCard({ table }: TableCardProps) {
  const { openModal } = useModalStore();
  const status = (table.status as TableStatus) || "AVAILABLE";
  const navigate = useNavigate();

  const deleteTableMutation = useDeleteTable();

  const updateStatusMutation = useUpdateTableStatus();
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const handleEditTable = (table: TableWithFloor) =>
    openModal("Edit Table", <TableForm table={table} />);

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't navigate if clicking on action buttons or dropdown
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("[data-dropdown]")) {
        return;
      }

      // Navigate to orders page with table context
      navigate({
        to: "/orders",
        search: {
          tableId: table.id,
          tableName: table.floor
            ? `${table.floor.name} - ${table.name}`
            : table.name,
        },
      });
    },
    [navigate, table.id, table.name, table.floor],
  );

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

  return (
    <Shad.Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200 cursor-pointer",
        "hover:shadow-lg hover:scale-[1.02]",
        statusColors[status],
        !table.isActive && "opacity-50",
      )}
      onClick={handleCardClick}
    >
      {/* Hover Action Buttons */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-5 right-2 z-10 flex gap-1  transition-opacity duration-200"
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 bg-background/80 backdrop-blur-sm  shadow-sm"
          onClick={() => {
            handleEditTable(table);
          }}
          aria-label="Edit table"
        >
          <Icon name="Pencil" className="h-3.5 w-3.5" />
        </Button>
        <AlertDialog
          iconButton="Trash2"
          variant="delete"
          buttonVariant="destructive"
          title={`Delete Table "${table.name}"?`}
          description={`This will remove table "${table.name}" from your restaurant layout. This action cannot be undone.`}
          className="size-7"
          onConfirm={() => {
            deleteTableMutation.mutate(table.id);
          }}
        />
      </div>

      <Shad.CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon
              name={statusIcons[status]}
              className={cn(
                "h-5 w-5",
                status === "AVAILABLE" &&
                  "text-emerald-600 dark:text-emerald-400",
                status === "OCCUPIED" && "text-red-600 dark:text-red-400",
                status === "RESERVED" && "text-amber-600 dark:text-amber-400",
              )}
            />

            {/* Status Dropdown for manual editing */}
            <Shad.DropdownMenu
              open={isStatusDropdownOpen}
              onOpenChange={setIsStatusDropdownOpen}
            >
              <Shad.DropdownMenuTrigger asChild>
                <div
                  data-dropdown="true"
                  className="cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <TableStatusBadge status={status} />
                </div>
              </Shad.DropdownMenuTrigger>
              <Shad.DropdownMenuContent
                align="start"
                onClick={(e) => e.stopPropagation()}
              >
                <Shad.DropdownMenuLabel>Change Status</Shad.DropdownMenuLabel>
                <Shad.DropdownMenuSeparator />
                {STATUS_OPTIONS.map((option) => (
                  <Shad.DropdownMenuItem
                    key={option.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(option.value);
                    }}
                    disabled={
                      option.value === status || updateStatusMutation.isPending
                    }
                  >
                    <Icon name={option.icon} className="mr-2 h-4 w-4" />
                    {option.label}
                    {option.value === status && (
                      <Icon name="Check" className="ml-auto h-4 w-4" />
                    )}
                  </Shad.DropdownMenuItem>
                ))}
              </Shad.DropdownMenuContent>
            </Shad.DropdownMenu>
          </div>
        </div>
      </Shad.CardHeader>

      <Shad.CardContent className="pt-0">
        <div className="text-center py-2">
          <h3 className="text-2xl font-bold text-foreground">
            {table.tableNumber}
          </h3>
          <p className="text-sm text-muted-foreground font-medium">
            {table.name}
          </p>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <Icon name="Users" className="h-4 w-4" />
            <span>{table.capacity} guests</span>
          </div>
          {table.floor && (
            <div className="flex items-center gap-1">
              <Icon name="Building2" className="h-4 w-4" />
              <span>{table.floor.name}</span>
            </div>
          )}
        </div>
      </Shad.CardContent>
    </Shad.Card>
  );
}
