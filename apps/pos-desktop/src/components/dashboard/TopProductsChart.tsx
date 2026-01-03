import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TopProductData } from "../../types/dashboard";
import { ChartContainer } from "./ChartContainer";
import { Empty } from "@repo/ui";

type Props = {
  data: TopProductData[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
};

export const TopProductsChart = ({
  data,
  isLoading,
  error,
  onRetry,
}: Props) => {
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
        <Empty description="No product data available" />
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
};
