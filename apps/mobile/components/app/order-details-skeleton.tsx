import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";

export const OrderDetailsSkeleton = () => {
  return (
    <View className="flex-1 bg-background p-4 gap-3">
      {/* Meta section */}
      <View className="bg-card border-border rounded-xl border p-4 gap-3">
        <Skeleton className="h-5 w-32 rounded" />
        <Skeleton className="h-5 w-40 rounded" />
        <Skeleton className="h-5 w-28 rounded" />
      </View>

      {/* Items section header */}
      <View className="bg-card border-border rounded-xl border p-4">
        <Skeleton className="h-6 w-16 rounded mb-3" />
        <View className="gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} className="gap-1">
              <Skeleton className="h-5 w-full rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </View>
          ))}
        </View>
      </View>

      {/* Totals section */}
      <View className="bg-card border-border rounded-xl border p-4 gap-2">
        <View className="flex-row justify-between gap-2">
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-5 w-24 rounded" />
        </View>
        <View className="flex-row justify-between gap-2">
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-5 w-24 rounded" />
        </View>
        <View className="flex-row justify-between gap-2 border-t border-border pt-2">
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-6 w-28 rounded" />
        </View>
      </View>

      {/* Payments section */}
      <View className="bg-card border-border rounded-xl border p-4 gap-2">
        <Skeleton className="h-6 w-20 rounded mb-2" />
        <View className="flex-row justify-between gap-2">
          <Skeleton className="h-5 w-24 rounded" />
          <Skeleton className="h-5 w-20 rounded" />
        </View>
      </View>
    </View>
  );
};
