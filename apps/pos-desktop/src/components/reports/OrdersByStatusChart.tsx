import {
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import { ChartContainer } from "../dashboard/ChartContainer";
import { Empty } from "@repo/ui";
import type { OrderStatusItem } from "@/types/reports";

interface OrdersByStatusChartProps {
    data: OrderStatusItem[];
    totalOrders: number;
    isLoading?: boolean;
    error?: Error | null;
    onRetry?: () => void;
}

// Status colors mapping
const STATUS_COLORS: Record<string, string> = {
    PENDING: "#f59e0b",
    CONFIRMED: "#3b82f6",
    PREPARING: "#8b5cf6",
    READY: "#06b6d4",
    COMPLETED: "#22c55e",
    CANCELLED: "#ef4444",
    REFUNDED: "#6b7280",
    ON_HOLD: "#f97316",
};

const getStatusColor = (status: string, index: number) => {
    const fallbackColors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088fe"];
    return STATUS_COLORS[status] || fallbackColors[index % fallbackColors.length];
};

// Format status for display
const formatStatus = (status: string): string => {
    return status
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase());
};

export const OrdersByStatusChart = ({
    data,
    totalOrders,
    isLoading,
    error,
    onRetry,
}: OrdersByStatusChartProps) => {
    const isEmpty = !data || data.length === 0;

    const chartData = data.map((item) => ({
        name: formatStatus(item.status),
        value: item.count,
        status: item.status,
    }));

    return (
        <ChartContainer
            title="Orders by Status"
            subtitle={`${totalOrders} total orders`}
            isLoading={isLoading}
            error={error}
            onRetry={onRetry}
        >
            {isEmpty ? (
                <Empty description="No order data available for selected period" />
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
                            label={({ percent }) =>
                                percent && percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""
                            }
                            labelLine={false}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={getStatusColor(entry.status, index)}
                                />
                            ))}
                        </Pie>
                        {/* Center label */}
                        <text
                            x="50%"
                            y="50%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="fill-foreground"
                        >
                            <tspan x="50%" dy="-0.5em" fontSize="24" fontWeight="bold">
                                {totalOrders}
                            </tspan>
                            <tspan x="50%" dy="1.5em" fontSize="12" className="fill-muted-foreground">
                                Orders
                            </tspan>
                        </text>
                        <Tooltip
                            formatter={(value: number | undefined) => [value ?? 0, "Orders"]}
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
                            formatter={(value) => (
                                <span className="text-xs text-muted-foreground">{value}</span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            )}
        </ChartContainer>
    );
};
