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
            "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    },
};

export function TableStatusBadge({ status, className }: TableStatusBadgeProps) {
    const config = statusConfig[status] || statusConfig.AVAILABLE;

    return (
        <Badge
            variant="outline"
            className={cn(
                "font-semibold text-base px-4 py-1.5",
                config.className,
                className
            )}
        >
            {config.label}
        </Badge>
    );
}
