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
import type { TopProductPoint } from "@/shared/models";
import { formatMoney } from "@/utils/format";
import { ChartCard } from "./ChartCard";
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_CONTENT_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  formatAxisCurrency,
  truncateLabel,
} from "./chart-theme";

type Props = {
  data: TopProductPoint[];
  currencySymbol: string;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
};

export const TopProductsChart = ({
  data,
  currencySymbol,
  isLoading,
  error,
  onRetry,
}: Props) => {
  const isEmpty = data.length === 0;

  return (
    <ChartCard
      title="Top Selling Products"
      subtitle="Best performers by revenue, last 30 days"
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
    >
      {isEmpty ? (
        <div className="flex h-[300px] items-center justify-center">
          <Empty
            icon="ChartBar"
            description="No product sales in this period"
          />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" barCategoryGap="30%">
            <CartesianGrid
              horizontal={false}
              vertical
              strokeDasharray="3 3"
              stroke={CHART_GRID_STROKE}
            />
            <XAxis
              type="number"
              tick={CHART_AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatAxisCurrency}
            />
            <YAxis
              dataKey="product"
              type="category"
              width={130}
              tick={CHART_AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={(product: string) => truncateLabel(product)}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.5 }}
              formatter={(value, _name, item) => {
                const product = (item as { payload?: TopProductPoint })
                  .payload;
                return [
                  `${formatMoney(Number(value) || 0, currencySymbol)} · ${product?.sold ?? 0} units`,
                  "Revenue",
                ];
              }}
              contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              itemStyle={CHART_TOOLTIP_ITEM_STYLE}
            />
            <Bar
              dataKey="revenue"
              fill="var(--chart-3)"
              radius={[0, 4, 4, 0]}
              name="Revenue"
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
};
