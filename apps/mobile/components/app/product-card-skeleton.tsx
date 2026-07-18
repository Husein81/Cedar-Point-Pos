import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";

export const ProductCardSkeleton = () => {
  return (
    <View className="flex-1 bg-card border-border rounded-xl border overflow-hidden">
      {/* Product image */}
      <Skeleton className="h-32 w-full rounded-t-md" />

      {/* Content section */}
      <View className="p-3 gap-2">
        {/* Product name */}
        <Skeleton className="h-5 w-full rounded" />

        {/* Price */}
        <Skeleton className="h-4 w-20 rounded" />

        {/* Add button placeholder */}
        <Skeleton className="h-9 w-full rounded mt-2" />
      </View>
    </View>
  );
};
