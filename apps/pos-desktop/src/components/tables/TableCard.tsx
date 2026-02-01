import { TableStatus } from "@repo/types";
import { Button, Shad, Icon, cn } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { TableStatusBadge } from "./TableStatusBadge";
import type { TableWithFloor } from "@/dto/tables.dto";
import { useUpdateTableStatus } from "@/hooks/useTable";

interface TableCardProps {
    table: TableWithFloor;
    onEdit?: (table: TableWithFloor) => void;
    onDelete?: (table: TableWithFloor) => void;
    onClick?: (table: TableWithFloor) => void;
}

const statusColors: Record<TableStatus, string> = {
    AVAILABLE:
        "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30",
    OCCUPIED:
        "border-red-500 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30",
    RESERVED:
        "border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30",
};

const statusIcons: Record<TableStatus, string> = {
    AVAILABLE: "CircleCheck",
    OCCUPIED: "Users",
    RESERVED: "Clock",
};

const statusOptions: { value: TableStatus; label: string; icon: string }[] = [
    { value: "AVAILABLE", label: "Available", icon: "CircleCheck" },
    { value: "OCCUPIED", label: "Occupied", icon: "Users" },
    { value: "RESERVED", label: "Reserved", icon: "Clock" },
];

export function TableCard({
    table,
    onEdit,
    onDelete,
}: TableCardProps) {
    const status = (table.status as TableStatus) || "AVAILABLE";
    const navigate = useNavigate();
    const updateStatusMutation = useUpdateTableStatus();
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

    const handleCardClick = useCallback((e: React.MouseEvent) => {
        // Don't navigate if clicking on action buttons or dropdown
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('[data-dropdown]')) {
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
    }, [navigate, table.id, table.name, table.floor]);

    const handleStatusChange = useCallback((newStatus: TableStatus) => {
        if (newStatus === status) return;

        updateStatusMutation.mutate({
            id: table.id,
            status: newStatus,
        });
        setIsStatusDropdownOpen(false);
    }, [updateStatusMutation, table.id, status]);

    return (
        <Shad.Card
            className={cn(
                "group relative overflow-hidden transition-all duration-200 cursor-pointer",
                "hover:shadow-lg hover:scale-[1.02]",
                statusColors[status],
                !table.isActive && "opacity-50"
            )}
            onClick={handleCardClick}
        >
            {/* Hover Action Buttons */}
            <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm"
                    onClick={(e) => {
                        if (e && typeof e === 'object' && 'stopPropagation' in e && typeof (e as any).stopPropagation === 'function') {
                            (e as any).stopPropagation();
                        }
                        onEdit?.(table);
                    }}
                    aria-label="Edit table"
                >
                    <Icon name="Pencil" className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground shadow-sm"
                    onClick={(e) => {
                        if (e && typeof e === 'object' && 'stopPropagation' in e && typeof (e as any).stopPropagation === 'function') {
                            (e as any).stopPropagation();
                        }
                        onDelete?.(table);
                    }}
                    aria-label="Delete table"
                >
                    <Icon name="Trash2" className="h-3.5 w-3.5" />
                </Button>
            </div>

            <Shad.CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <Icon
                            name={statusIcons[status]}
                            className={cn(
                                "h-5 w-5",
                                status === "AVAILABLE" && "text-emerald-600 dark:text-emerald-400",
                                status === "OCCUPIED" && "text-red-600 dark:text-red-400",
                                status === "RESERVED" && "text-amber-600 dark:text-amber-400"
                            )}
                        />

                        {/* Status Dropdown for manual editing */}
                        <Shad.DropdownMenu open={isStatusDropdownOpen} onOpenChange={setIsStatusDropdownOpen}>
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
                                {statusOptions.map((option) => (
                                    <Shad.DropdownMenuItem
                                        key={option.value}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleStatusChange(option.value);
                                        }}
                                        disabled={option.value === status || updateStatusMutation.isPending}
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
