import { Icon, Shad } from "@repo/ui";
import { ReactNode } from "react";
import { ErrorState } from "./error-state";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
};

export const ChartContainer = ({
  title,
  subtitle,
  children,
  isLoading,
  error,
  onRetry,
}: Props) => {
  return (
    <Shad.Card className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
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
    </Shad.Card>
  );
};

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
