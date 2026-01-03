import { memo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer } from "./ChartContainer";
import type { TopProductData } from "../../types/dashboard";

interface TopProductsChartProps {
  data: TopProductData[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export const TopProductsChart = memo(
  ({ data, isLoading, error, onRetry }: TopProductsChartProps) => {
    const isEmpty = !data || data.length === 0;

    return (
      <ChartContainer
        title="Top Selling Products"
        subtitle="Best performers by units sold"
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
      >
        {isEmpty ? (
          <EmptyState message="No product data available" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis
                dataKey="product"
                type="category"
                width={100}
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <Tooltip
                // @ts-expect-error - Recharts Formatter type compatibility
                formatter={(value: number | undefined, name: string) => [
                  name === "sold"
                    ? `${value ?? 0} units`
                    : `$${(value ?? 0).toFixed(2)}`,
                  name === "sold" ? "Units Sold" : "Revenue",
                ]}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar
                dataKey="sold"
                fill="#8884d8"
                radius={[0, 8, 8, 0]}
                name="Units Sold"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    );
  }
);

TopProductsChart.displayName = "TopProductsChart";

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center h-[300px]">
    <p className="text-gray-500 dark:text-gray-400">{message}</p>
  </div>
);
