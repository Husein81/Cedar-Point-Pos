import { Skeleton } from "@repo/ui";
import { DollarSign, ShoppingCart, TrendingUp, Percent } from "lucide-react";
import type { SalesReportData } from "@/types/reports";

interface ReportsSummaryCardsProps {
  data?: SalesReportData;
  isLoading?: boolean;
}

// Currency formatter using Intl.NumberFormat
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("en-US").format(value);
};

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  isLoading?: boolean;
}

const SummaryCard = ({ title, value, icon, isLoading }: SummaryCardProps) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-5 rounded" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-all hover:shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {title}
        </p>
        <div className="text-gray-400 dark:text-gray-500">{icon}</div>
      </div>
      <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
};

export const ReportsSummaryCards = ({
  data,
  isLoading,
}: ReportsSummaryCardsProps) => {
  const cards = [
    {
      title: "Total Revenue",
      value: data ? formatCurrency(data.totalRevenue) : "—",
      icon: <DollarSign className="w-5 h-5" />,
    },
    {
      title: "Total Orders",
      value: data ? formatNumber(data.orderCount) : "—",
      icon: <ShoppingCart className="w-5 h-5" />,
    },
    {
      title: "Avg Order Value",
      value: data ? formatCurrency(data.averageOrderValue) : "—",
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      title: "Total Discounts",
      value: data ? formatCurrency(data.totalDiscount) : "—",
      icon: <Percent className="w-5 h-5" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <SummaryCard
          key={card.title}
          title={card.title}
          value={card.value}
          icon={card.icon}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
};
