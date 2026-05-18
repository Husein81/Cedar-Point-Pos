import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer } from "./ChartContainer";
import type { HourlyRevenueData } from "../../types/dashboard";
import { Empty } from "@repo/ui";

type Props = {
  data: HourlyRevenueData[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
};

export const HourlyRevenueChart = ({
  data,
  isLoading,
  error,
  onRetry,
}: Props) => {
  const isEmpty = !data || data.length === 0;

  return (
    <ChartContainer
      title="Hourly Revenue Distribution"
      subtitle="Today's revenue by hour"
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
    >
      {isEmpty ? (
        <Empty description="No hourly data available for today" />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid
              horizontal
              vertical={false}
              strokeDasharray="3 3"
              stroke="#e0e0e0"
            />
            <XAxis dataKey="hour" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              tickFormatter={(value: number) => `$${value.toLocaleString()}`}
            />
            <Tooltip
              formatter={(value?: unknown) => [
                `$${(Number(value) || 0).toFixed(2)}`,
                "Revenue",
              ]}
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",

                borderRadius: "8px",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#82ca9d"
              strokeWidth={2}
              dot={{ r: 4, fill: "#82ca9d" }}
              activeDot={{ r: 6 }}
              name="Revenue ($)"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
};
