import { Empty } from "@repo/ui";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklySalesPoint } from "@/shared/models";
import { formatMoney } from "@/utils/format";
import { ChartCard } from "./ChartCard";
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_CONTENT_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  formatAxisCurrency,
} from "./chart-theme";

type Props = {
  data: WeeklySalesPoint[];
  currencySymbol: string;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
};

export const WeeklySalesChart = ({
  data,
  currencySymbol,
  isLoading,
  error,
  onRetry,
}: Props) => {
  // The query returns all 7 days zero-filled, so "empty" means no sales at all
  const hasSales = data.some((day) => day.sales > 0);

  return (
    <ChartCard
      title="Weekly Sales Trend"
      subtitle="Revenue over the last 7 days"
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
    >
      {!hasSales ? (
        <div className="flex h-[300px] items-center justify-center">
          <Empty
            icon="ChartArea"
            description="No sales recorded in the past week"
          />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="weeklySalesFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              horizontal
              vertical={false}
              strokeDasharray="3 3"
              stroke={CHART_GRID_STROKE}
            />
            <XAxis
              dataKey="name"
              tick={CHART_AXIS_TICK}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={CHART_AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={formatAxisCurrency}
            />
            <Tooltip
              formatter={(value) => [
                formatMoney(Number(value) || 0, currencySymbol),
                "Sales",
              ]}
              contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              itemStyle={CHART_TOOLTIP_ITEM_STYLE}
            />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="var(--chart-1)"
              fill="url(#weeklySalesFill)"
              strokeWidth={2}
              activeDot={{ r: 5, strokeWidth: 0 }}
              name="Sales"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
};
