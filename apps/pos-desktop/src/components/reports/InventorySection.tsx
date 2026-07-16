import { useState } from "react";
import { Shad, Skeleton, Empty, Button } from "@repo/ui";
import { ChevronDown, ChevronUp, Package } from "lucide-react";
import type { InventoryMovementItem } from "@/dto/reports.dto";

interface InventorySectionProps {
    data: InventoryMovementItem[];
    totalMovements: number;
    isLoading?: boolean;
    error?: Error | null;
    onRetry?: () => void;
}

// Format change type for display
const formatChangeType = (type: string): string => {
    const typeMap: Record<string, string> = {
        ADJUSTMENT: "Manual Adjustment",
        SALE: "Sale",
        PURCHASE: "Purchase",
        TRANSFER_IN: "Transfer In",
        TRANSFER_OUT: "Transfer Out",
        RETURN: "Return",
        DAMAGE: "Damage/Loss",
        INITIAL: "Initial Stock",
    };
    return typeMap[type] || type.replace(/_/g, " ");
};

// Get color class based on change type
const getChangeTypeColor = (type: string): string => {
    const positiveTypes = ["PURCHASE", "TRANSFER_IN", "RETURN", "INITIAL", "ADJUSTMENT"];
    const negativeTypes = ["SALE", "TRANSFER_OUT", "DAMAGE"];

    if (positiveTypes.includes(type)) return "text-green-600 dark:text-green-400";
    if (negativeTypes.includes(type)) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
};

export const InventorySection = ({
    data,
    totalMovements,
    isLoading,
    error,
    onRetry,
}: InventorySectionProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isEmpty = !data || data.length === 0;

    return (
        <Shad.Card className="overflow-hidden">
            {/* Collapsible Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div className="text-left">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Inventory Movements
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {totalMovements} total movements
                        </p>
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
            </button>

            {/* Expandable Content */}
            {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    {isLoading ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <Skeleton className="h-4 w-32" />
                                    <div className="flex gap-4">
                                        <Skeleton className="h-4 w-12" />
                                        <Skeleton className="h-4 w-16" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-4">
                            <p className="text-destructive text-sm mb-2">Failed to load data</p>
                            {onRetry && (
                                <Button variant="outline" size="sm" onClick={onRetry}>
                                    Retry
                                </Button>
                            )}
                        </div>
                    ) : isEmpty ? (
                        <Empty description="No inventory movements for selected period" />
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        Type
                                    </th>
                                    <th className="text-right py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        Count
                                    </th>
                                    <th className="text-right py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        Net Adjustment
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {data.map((item, index) => (
                                    <tr key={index}>
                                        <td className="py-2 text-sm text-gray-900 dark:text-white">
                                            {formatChangeType(item.changeType)}
                                        </td>
                                        <td className="py-2 text-right text-sm text-gray-600 dark:text-gray-300">
                                            {item.count}
                                        </td>
                                        <td className={`py-2 text-right text-sm font-medium ${getChangeTypeColor(item.changeType)}`}>
                                            {item.totalAdjustment > 0 ? "+" : ""}
                                            {item.totalAdjustment}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </Shad.Card>
    );
};
