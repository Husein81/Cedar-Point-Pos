import { memo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const SummaryCard = memo(
  ({ title, value, trend, icon, isLoading }: SummaryCardProps) => {
    if (isLoading) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-all hover:shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          {icon && (
            <div className="text-gray-400 dark:text-gray-500">{icon}</div>
          )}
        </div>

        <div className="flex items-baseline justify-between">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>

          {trend && (
            <div className="flex items-center gap-1">
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span
                className={`text-sm font-medium ${
                  trend.isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.value}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

SummaryCard.displayName = "SummaryCard";
