import { TableStatus } from "@repo/types";
import { Badge, cn } from "@repo/ui";

interface TableStatusBadgeProps {
    status: TableStatus;
    className?: string;
}

const statusConfig: Record<
    TableStatus,
    { label: string; className: string }
> = {
    AVAILABLE: {
        label: "Available",
        className:
            "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    },
    OCCUPIED: {
        label: "Occupied",
        className:
            "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    },
    RESERVED: {
        label: "Reserved",
        className:
            "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    },
};

export function TableStatusBadge({ status, className }: TableStatusBadgeProps) {
    const config = statusConfig[status] || statusConfig.AVAILABLE;

    return (
        <Badge
            variant="outline"
            className={cn(
                "font-medium text-xs px-2 py-0.5",
                config.className,
                className
            )}
        >
            {config.label}
        </Badge>
    );
}
