import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";

export const OrderCardSkeleton = () => {
  return (
    <View className="bg-card border-border rounded-xl border p-4 gap-3">
      {/* Header row (order number + status) */}
      <View className="flex-row items-center justify-between">
        <Skeleton className="h-6 w-24 rounded" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </View>

      {/* Details row (table, items, time) */}
      <View className="flex-row items-center gap-4">
        <Skeleton className="h-5 w-20 rounded" />
        <Skeleton className="h-5 w-20 rounded" />
        <Skeleton className="h-5 w-16 rounded" />
      </View>

      {/* Footer row (staff name + total) */}
      <View className="border-t border-border pt-3">
        <View className="flex-row items-center justify-between">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-6 w-24 rounded" />
        </View>
      </View>
    </View>
  );
};
