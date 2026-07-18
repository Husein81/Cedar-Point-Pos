import { Empty } from "@repo/ui";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type PieLabelRenderProps,
} from "recharts";
import type { CategoryData } from "../../dto/dashboard.dto";
import { formatCurrency } from "../../utils/reportHelpers";
import { ChartCard } from "./ChartCard";
import {
  CHART_COLORS,
  CHART_TOOLTIP_CONTENT_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
} from "./chart-theme";

type Props = {
  data: CategoryData[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
};

// Hide slice labels below this share to avoid overlapping text
const MIN_LABEL_PERCENT = 0.07;

export const SalesByCategoryChart = ({
  data,
  isLoading,
  error,
  onRetry,
}: Props) => {
  const isEmpty = data.length === 0;

  return (
    <ChartCard
      title="Sales by Category"
      subtitle="Revenue share per category, last 30 days"
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
    >
      {isEmpty ? (
        <div className="flex h-[300px] items-center justify-center">
          <Empty icon="ChartPie" description="No category sales in this period" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={100}
              paddingAngle={2}
              labelLine={false}
              label={renderPercentLabel}
              dataKey="sales"
              nameKey="name"
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  stroke="var(--card)"
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => {
                const category = (item as { payload?: CategoryData }).payload;
                return [
                  `${formatCurrency(Number(value) || 0)} · ${category?.value ?? 0} items`,
                  category?.name ?? "",
                ];
              }}
              contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              itemStyle={CHART_TOOLTIP_ITEM_STYLE}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span className="text-xs text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
};

const RADIAN = Math.PI / 180;

const renderPercentLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: PieLabelRenderProps) => {
  const centerX = Number(cx);
  const centerY = Number(cy);
  const inner = Number(innerRadius);
  const outer = Number(outerRadius);
  const angle = Number(midAngle);
  const share = Number(percent);

  if ([centerX, centerY, inner, outer, angle, share].some(Number.isNaN)) {
    return null;
  }
  if (share < MIN_LABEL_PERCENT) return null;

  const radius = inner + (outer - inner) * 0.5;
  const x = centerX + radius * Math.cos(-angle * RADIAN);
  const y = centerY + radius * Math.sin(-angle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${(share * 100).toFixed(0)}%`}
    </text>
  );
};
