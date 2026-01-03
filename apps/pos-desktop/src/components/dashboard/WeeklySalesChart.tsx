import { memo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer } from "./ChartContainer";
import type { WeeklySalesData } from "../../types/dashboard";

interface WeeklySalesChartProps {
  data: WeeklySalesData[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export const WeeklySalesChart = memo(
  ({ data, isLoading, error, onRetry }: WeeklySalesChartProps) => {
    const isEmpty = !data || data.length === 0;

    return (
      <ChartContainer
        title="Weekly Sales Trend"
        subtitle="Last 7 days sales performance"
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
      >
        {isEmpty ? (
          <EmptyState message="No sales data available for the past week" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                tickFormatter={(value: number) => `$${value.toLocaleString()}`}
              />
              <Tooltip
                formatter={(value: number | undefined) => [
                  `$${(value ?? 0).toFixed(2)}`,
                  "Sales",
                ]}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#8884d8"
                fill="url(#colorSales)"
                strokeWidth={2}
                name="Sales ($)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    );
  }
);

WeeklySalesChart.displayName = "WeeklySalesChart";

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center h-[300px]">
    <p className="text-gray-500 dark:text-gray-400">{message}</p>
  </div>
);
