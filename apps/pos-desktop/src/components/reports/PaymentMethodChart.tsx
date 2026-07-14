import {
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import { ChartCard } from "../dashboard/ChartCard";
import { Empty } from "@repo/ui";
import type { PaymentBreakdownItem } from "@/types/reports";

interface PaymentMethodChartProps {
    data: PaymentBreakdownItem[];
    grandTotal: number;
    isLoading?: boolean;
    error?: Error | null;
    onRetry?: () => void;
}

// Payment method colors
const PAYMENT_COLORS: Record<string, string> = {
    CASH: "#22c55e",
    CARD: "#3b82f6",
    MIXED: "#8b5cf6",
    MOBILE: "#f59e0b",
    OTHER: "#6b7280",
};

const getPaymentColor = (method: string, index: number) => {
    const fallbackColors = ["#10b981", "#6366f1", "#f97316", "#ec4899", "#14b8a6"];
    return PAYMENT_COLORS[method] || fallbackColors[index % fallbackColors.length];
};

// Format payment method for display
const formatMethod = (method: string): string => {
    return method
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase());
};

// Format currency
const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    }).format(value);
};

export const PaymentMethodChart = ({
    data,
    grandTotal,
    isLoading,
    error,
    onRetry,
}: PaymentMethodChartProps) => {
    const isEmpty = !data || data.length === 0;

    const chartData = data.map((item) => ({
        name: formatMethod(item.method),
        value: item.totalAmount,
        count: item.transactionCount,
        method: item.method,
        percentage:
            grandTotal > 0 ? ((item.totalAmount / grandTotal) * 100).toFixed(1) : "0",
    }));

    return (
        <ChartCard
            title="Payment Methods"
            subtitle={`Total: ${formatCurrency(grandTotal)}`}
            isLoading={isLoading}
            error={error}
            onRetry={onRetry}
        >
            {isEmpty ? (
                <Empty description="No payment data available for selected period" />
            ) : (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ payload }) =>
                                parseFloat(payload.percentage) > 5 ? `${payload.percentage}%` : ""
                            }
                            labelLine={false}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={getPaymentColor(entry.method, index)}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: any, _name: any, props: any) => {
                                const entry = props.payload;
                                return [
                                    `${formatCurrency(Number(value) || 0)} (${entry.count} transactions)`,
                                    entry.name,
                                ];
                            }}
                            contentStyle={{
                                backgroundColor: "rgba(255, 255, 255, 0.95)",
                                border: "1px solid #e0e0e0",
                                borderRadius: "8px",
                                fontSize: "12px",
                            }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            formatter={(value, entry) => {
                                const payload = entry.payload as { percentage?: string };
                                return (
                                    <span className="text-xs text-muted-foreground">
                                        {value} ({payload?.percentage ?? 0}%)
                                    </span>
                                );
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            )}
        </ChartCard>
    );
};
