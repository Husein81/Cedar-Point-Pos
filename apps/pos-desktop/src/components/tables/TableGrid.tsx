import type { TableWithFloor } from "@/dto/tables.dto";
import { TableCard } from "./TableCard";

interface TableGridProps {
    tables: TableWithFloor[];
    onEditTable?: (table: TableWithFloor) => void;
    onDeleteTable?: (table: TableWithFloor) => void;
    onTableClick?: (table: TableWithFloor) => void;
    isLoading?: boolean;
}

export function TableGrid({
    tables,
    onEditTable,
    onDeleteTable,
    onTableClick,
    isLoading,
}: TableGridProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-40 bg-muted animate-pulse rounded-lg border-2 border-muted"
                    />
                ))}
            </div>
        );
    }

    if (tables.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted p-6 mb-4">
                    <svg
                        className="h-12 w-12 text-muted-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                        />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                    No tables found
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                    Add your first table to start managing your restaurant floor.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {tables.map((table) => (
                <TableCard
                    key={table.id}
                    table={table}
                    onEdit={onEditTable}
                    onDelete={onDeleteTable}
                    onClick={onTableClick}
                />
            ))}
        </div>
    );
}
