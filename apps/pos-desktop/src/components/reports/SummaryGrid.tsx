import {
  SummaryCard,
  SummaryCardProps,
  SummaryCardSkeleton,
} from "./SummaryCard";

type Props = {
  items: SummaryCardProps[];
  isLoading?: boolean;
  count?: number;
  columns?: "2" | "3" | "4";
};

export function SummaryGrid({
  items,
  isLoading,
  count = 4,
  columns = "4",
}: Props) {
  const gridClasses = {
    "2": "md:grid-cols-2",
    "3": "md:grid-cols-3",
    "4": "md:grid-cols-2 lg:grid-cols-4",
  };

  if (isLoading) {
    return (
      <div className={`grid gap-4 ${gridClasses[columns]}`}>
        {Array.from({ length: count }).map((_, i) => (
          <SummaryCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${gridClasses[columns]}`}>
      {items.map((item, i) => (
        <SummaryCard key={i} {...item} />
      ))}
    </div>
  );
}
