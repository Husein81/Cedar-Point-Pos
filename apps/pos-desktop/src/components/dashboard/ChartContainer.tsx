import { Icon } from "@repo/ui";
import { memo, ReactNode } from "react";

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export const ChartContainer = memo(
  ({
    title,
    subtitle,
    children,
    isLoading,
    error,
    onRetry,
  }: ChartContainerProps) => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>

        <div className="relative">
          {isLoading && <LoadingState />}
          {error && <ErrorState error={error} onRetry={onRetry} />}
          {!isLoading && !error && children}
        </div>
      </div>
    );
  }
);

ChartContainer.displayName = "ChartContainer";

const LoadingState = () => (
  <div className="flex items-center justify-center h-[300px]">
    <div className="text-center">
      <Icon
        name="LoaderCircle"
        className="w-8 h-8 mx-auto animate-spin text-gray-500"
      />
      <p className="text-gray-600 dark:text-gray-400">Loading chart data...</p>
    </div>
  </div>
);

const ErrorState = ({
  error,
  onRetry,
}: {
  error: Error;
  onRetry?: () => void;
}) => (
  <div className="flex flex-col items-center justify-center h-[300px] text-center">
    <div className="text-red-500 mb-4">
      <svg
        className="w-12 h-12 mx-auto"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </div>
    <p className="text-gray-600 dark:text-gray-400 mb-2">Failed to load data</p>
    <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
      {error.message}
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Retry
      </button>
    )}
  </div>
);
