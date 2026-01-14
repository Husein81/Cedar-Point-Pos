import { Shad, Skeleton, Empty, Button } from "@repo/ui";
import type { TopProductData } from "@/types/dashboard";

interface TopProductsTableProps {
    data: TopProductData[];
    isLoading?: boolean;
    error?: Error | null;
    onRetry?: () => void;
}

// Format currency
const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    }).format(value);
};

export const TopProductsTable = ({
    data,
    isLoading,
    error,
    onRetry,
}: TopProductsTableProps) => {
    const isEmpty = !data || data.length === 0;

    if (isLoading) {
        return (
            <Shad.Card className="p-6">
                <div className="mb-4">
                    <Skeleton className="h-6 w-40 mb-2" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <Skeleton className="h-4 w-48" />
                            <div className="flex gap-4">
                                <Skeleton className="h-4 w-12" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                        </div>
                    ))}
                </div>
            </Shad.Card>
        );
    }

    if (error) {
        return (
            <Shad.Card className="p-6">
                <div className="text-center py-8">
                    <p className="text-destructive mb-4">Failed to load data</p>
                    {onRetry && (
                        <Button variant="outline" size="sm" onClick={onRetry}>
                            Retry
                        </Button>
                    )}
                </div>
            </Shad.Card>
        );
    }

    return (
        <Shad.Card className="p-6">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Top Selling Products
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Ranked by revenue
                </p>
            </div>

            {isEmpty ? (
                <Empty description="No product data available for selected period" />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Product
                                </th>
                                <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Qty Sold
                                </th>
                                <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Revenue
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {data.map((item, index) => (
                                <tr
                                    key={index}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                >
                                    <td className="py-3 px-2">
                                        <div className="flex items-center gap-3">
                                            <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                                                {index + 1}
                                            </span>
                                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                                                {item.product}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-2 text-right text-sm text-gray-600 dark:text-gray-300">
                                        {item.sold}
                                    </td>
                                    <td className="py-3 px-2 text-right text-sm font-medium text-gray-900 dark:text-white">
                                        {formatCurrency(item.revenue)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Shad.Card>
    );
};
