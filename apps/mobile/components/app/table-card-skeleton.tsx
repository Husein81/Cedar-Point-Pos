import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";

export const TableCardSkeleton = () => {
  return (
    <View className="bg-card border-border rounded-lg border p-3 gap-2">
      {/* Table number/name */}
      <Skeleton className="h-6 w-16 rounded" />

      {/* Status indicator */}
      <Skeleton className="h-4 w-20 rounded-full" />

      {/* Guest count / details */}
      <Skeleton className="h-4 w-24 rounded" />
    </View>
  );
};
