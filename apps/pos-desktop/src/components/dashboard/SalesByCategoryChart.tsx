import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { CategoryData } from "../../types/dashboard";
import { ChartContainer } from "./ChartContainer";
import { Empty } from "@repo/ui";

type Props = {
  data: CategoryData[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
};

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

export const SalesByCategoryChart = ({
  data,
  isLoading,
  error,
  onRetry,
}: Props) => {
  const isEmpty = data.length === 0;

  return (
    <ChartContainer
      title="Sales by Category"
      subtitle="Revenue distribution across categories"
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
    >
      {isEmpty ? (
        <Empty description="No category data available" />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel as any}
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
              formatter={(
                value?: unknown,
                _name?: unknown,
                props?: unknown,
              ) => [
                `${value ?? 0} items ($${(props as { payload: CategoryData }).payload?.sales.toFixed(2)})`,
                (props as { payload: CategoryData }).payload?.name,
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
};

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
