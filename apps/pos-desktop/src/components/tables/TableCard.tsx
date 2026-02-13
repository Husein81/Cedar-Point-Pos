import type { TableWithFloor } from "@/dto/tables.dto";
import { useDeleteTable, useUpdateTableStatus } from "@/hooks/useTable";
import { useModalStore } from "@/store/modalStore";
import { TableStatus } from "@repo/types";
import { Badge, Button, cn, Icon, Shad } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import React, { useCallback, useState } from "react";
import { AlertDialog } from "../common";
import { STATUS_OPTIONS, statusColors, TABLE_STATUS_CONFIG } from "./config";
import { TableForm } from "./TableForm";
import { TableActiveOrdersDialog } from "./TableActiveOrdersDialog";

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
  const [isActiveOrdersOpen, setIsActiveOrdersOpen] = useState(false);

  const handleEditTable = (table: TableWithFloor) =>
    openModal("Edit Table", <TableForm table={table} />);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons or dropdown
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("[data-dropdown]")) {
      return;
    }

    // If table is OCCUPIED, show active orders dialog instead of navigating
    if (status === "OCCUPIED") {
      setIsActiveOrdersOpen(true);
      return;
    }

    // Navigate to orders page with table context (AVAILABLE or RESERVED tables)
    navigate({
      to: "/orders",
      search: {
        tableId: table.id,
        tableName: table.floor
          ? `${table.floor.name} - ${table.name}`
          : table.name,
      },
    });
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
    <Shad.Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200 cursor-pointer",
        "hover:shadow-md hover:-translate-y-0.5",
        statusColors[status],
        !table.isActive && "opacity-50",
      )}
      onClick={handleCardClick}
    >
      {/* Hover Action Buttons */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-3 right-3 z-10 flex gap-1.5 items-center transition-opacity duration-200"
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 bg-background/80 backdrop-blur-sm shadow-sm"
          onClick={() => {
            handleEditTable(table);
          }}
          aria-label="Edit table"
        >
          <Icon name="Pencil" className="h-4 w-4" />
        </Button>
        <AlertDialog
          iconButton="Trash2"
          variant="delete"
          buttonVariant="destructive"
          title={`Delete Table "${table.name}"?`}
          description={`This will remove table "${table.name}" from your restaurant layout. This action cannot be undone.`}
          className="h-9 w-9"
          onConfirm={() => {
            deleteTableMutation.mutate(table.id);
          }}
        />
      </div>

      <Shad.CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
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
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-semibold text-xs px-3 py-0.5",
                      config.className,
                    )}
                  >
                    {config.label}
                  </Badge>
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

      <Shad.CardContent className="pt-0 pb-4">
        <div className="text-center py-3">
          <h3 className="text-3xl font-bold text-foreground">
            {table.tableNumber}
          </h3>
          <p className="text-sm text-muted-foreground font-medium mt-0.5">
            {table.name}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <Icon name="Users" className="h-3.5 w-3.5" />
            <span>{table.capacity} guests</span>
          </div>
          {table.floor && (
            <div className="flex items-center gap-1.5">
              <Icon name="Building2" className="h-3.5 w-3.5" />
              <span>{table.floor.name}</span>
            </div>
          )}
        </div>
      </Shad.CardContent>

      {/* Active Orders Dialog — shown when clicking an occupied table */}
      <TableActiveOrdersDialog
        table={table}
        open={isActiveOrdersOpen}
        onOpenChange={setIsActiveOrdersOpen}
      />
    </Shad.Card>
  );
}
