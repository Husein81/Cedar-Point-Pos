import { memo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { ChartContainer } from "./ChartContainer";
import type { CategoryData } from "../../types/dashboard";

interface SalesByCategoryChartProps {
  data: CategoryData[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#8dd1e1",
];

export const SalesByCategoryChart = memo(
  ({ data, isLoading, error, onRetry }: SalesByCategoryChartProps) => {
    const isEmpty = !data || data.length === 0;

    return (
      <ChartContainer
        title="Sales by Category"
        subtitle="Revenue distribution across categories"
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
      >
        {isEmpty ? (
          <EmptyState message="No category data available" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                // @ts-expect-error - Recharts ChartDataInput type compatibility
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                // @ts-expect-error - Recharts PieLabel type compatibility
                label={renderCustomizedLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                // @ts-expect-error - Recharts Formatter type compatibility
                formatter={(
                  value: number | undefined,
                  _name: unknown,
                  props: { payload: CategoryData }
                ) => [
                  `${value ?? 0} items ($${props.payload.sales.toFixed(2)})`,
                  props.payload.name,
                ]}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    );
  }
);

SalesByCategoryChart.displayName = "SalesByCategoryChart";

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center h-[300px]">
    <p className="text-gray-500 dark:text-gray-400">{message}</p>
  </div>
);
