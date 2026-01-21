import { useState } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { ChartContainer } from "../dashboard/ChartContainer";
import { Button, Empty } from "@repo/ui";
import type { WeeklySalesData, HourlyRevenueData } from "@/types/dashboard";

type ChartMode = "daily" | "hourly";

interface SalesOverTimeChartProps {
    dailyData: WeeklySalesData[];
    hourlyData: HourlyRevenueData[];
    isDailyLoading?: boolean;
    isHourlyLoading?: boolean;
    dailyError?: Error | null;
    hourlyError?: Error | null;
    onRetryDaily?: () => void;
    onRetryHourly?: () => void;
}

// Format hourly data for display
const formatHourlyData = (data: HourlyRevenueData[]) => {
    return data.map((item) => ({
        name: `${item.hour}:00`,
        sales: item.revenue,
    }));
};

export const SalesOverTimeChart = ({
    dailyData,
    hourlyData,
    isDailyLoading,
    isHourlyLoading,
    dailyError,
    hourlyError,
    onRetryDaily,
    onRetryHourly,
}: SalesOverTimeChartProps) => {
    const [mode, setMode] = useState<ChartMode>("daily");

    const isLoading = mode === "daily" ? isDailyLoading : isHourlyLoading;
    const error = mode === "daily" ? dailyError : hourlyError;
    const onRetry = mode === "daily" ? onRetryDaily : onRetryHourly;

    const chartData = mode === "daily" ? dailyData : formatHourlyData(hourlyData);
    const isEmpty = !chartData || chartData.length === 0;

    return (
        <ChartContainer
            title="Sales Over Time"
            subtitle={mode === "daily" ? "Last 7 days" : "Today's hourly breakdown"}
            isLoading={isLoading}
            error={error}
            onRetry={onRetry}
        >
            {/* Toggle Buttons */}
            <div className="flex gap-2 mb-4">
                <Button
                    variant={mode === "daily" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode("daily")}
                >
                    Daily
                </Button>
                <Button
                    variant={mode === "hourly" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode("hourly")}
                >
                    Hourly
                </Button>
            </div>

            {isEmpty ? (
                <Empty description="No sales data available for selected period" />
            ) : (
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorSalesReport" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            horizontal
                            vertical={false}
                            strokeDasharray="3 3"
                            stroke="#e0e0e0"
                        />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value: number) => `$${value.toLocaleString()}`}
                        />
                        <Tooltip
                            formatter={(value: number | string | undefined) => [
                                `$${Number(value ?? 0).toFixed(2)}`,
                                "Revenue",
                            ]}
                            contentStyle={{
                                backgroundColor: "rgba(255, 255, 255, 0.95)",
                                border: "1px solid #e0e0e0",
                                borderRadius: "8px",
                                fontSize: "12px",
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="sales"
                            stroke="#3b82f6"
                            fill="url(#colorSalesReport)"
                            strokeWidth={2}
                            name="Revenue"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </ChartContainer>
    );
};
