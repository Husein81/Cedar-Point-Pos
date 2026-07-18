import { Empty } from "@repo/ui";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HourlyRevenueData } from "../../dto/dashboard.dto";
import { formatCurrency } from "../../utils/reportHelpers";
import { ChartCard } from "./ChartCard";
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_CONTENT_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  formatAxisCurrency,
  formatHourLabel,
} from "./chart-theme";

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
  // The API returns all 24 hours zero-filled, so "empty" means no revenue yet
  const hasRevenue = data.some((entry) => entry.revenue > 0);

  return (
    <ChartCard
      title="Hourly Revenue"
      subtitle="Today's revenue by hour"
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
    >
      {!hasRevenue ? (
        <div className="flex h-[300px] items-center justify-center">
          <Empty
            icon="ChartColumn"
            description="No revenue recorded today yet"
          />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} barCategoryGap="25%">
            <CartesianGrid
              horizontal
              vertical={false}
              strokeDasharray="3 3"
              stroke={CHART_GRID_STROKE}
            />
            <XAxis
              dataKey="hour"
              tick={CHART_AXIS_TICK}
              tickLine={false}
              axisLine={false}
              interval={2}
              tickFormatter={(hour: number) => formatHourLabel(hour)}
            />
            <YAxis
              tick={CHART_AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={formatAxisCurrency}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.5 }}
              labelFormatter={(hour) => formatHourLabel(Number(hour))}
              formatter={(value) => [
                formatCurrency(Number(value) || 0),
                "Revenue",
              ]}
              contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              itemStyle={CHART_TOOLTIP_ITEM_STYLE}
            />
            <Bar
              dataKey="revenue"
              fill="var(--chart-2)"
              radius={[4, 4, 0, 0]}
              name="Revenue"
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
};
