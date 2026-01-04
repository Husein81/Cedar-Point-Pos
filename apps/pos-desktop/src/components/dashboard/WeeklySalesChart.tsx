import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklySalesData } from "../../types/dashboard";
import { ChartContainer } from "./ChartContainer";
import { Empty } from "@repo/ui";

type Props = {
  data: WeeklySalesData[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
};

export const WeeklySalesChart = ({
  data,
  isLoading,
  error,
  onRetry,
}: Props) => {
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
        <Empty description="No sales data available for the past week" />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid
              horizontal
              vertical={false}
              strokeDasharray="3 3"
              stroke="#e0e0e0"
            />
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
};
