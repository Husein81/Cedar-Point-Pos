import { OrderStatus } from "@repo/types";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Chip,
  EmptyState,
  OrderCard,
  OrderCardSkeleton,
  SearchBar,
} from "@/components/app";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useOrdersInfinite } from "@/hooks/use-orders";
import { THEME } from "@/lib/theme";
import { useBranchStore } from "@/store/branch";
import { useThemeStore } from "@/store/theme";

const STATUS_FILTERS: { label: string; value?: OrderStatus }[] = [
  { label: "All" },
  { label: "Draft", value: OrderStatus.DRAFT },
  { label: "Placed", value: OrderStatus.PLACED },
  { label: "Preparing", value: OrderStatus.PREPARING },
  { label: "Ready", value: OrderStatus.READY },
  { label: "Served", value: OrderStatus.SERVED },
  { label: "Completed", value: OrderStatus.COMPLETED },
  { label: "Cancelled", value: OrderStatus.CANCELLED },
];

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const theme = isDark ? THEME.dark : THEME.light;
  const { branchId } = useBranchStore();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);

  const ordersQuery = useOrdersInfinite({
    branchId: branchId ?? undefined,
    status,
    search: search.trim() || undefined,
  });

  const orders = useMemo(() => {
    return ordersQuery.data?.pages.flatMap((page) => page.data) ?? [];
  }, [ordersQuery.data]);

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 12 }}
    >
      <View className="gap-3 px-4 pb-3">
        <Text className="text-2xl font-bold">Orders</Text>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search order number..."
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {STATUS_FILTERS.map((filter) => (
            <Chip
              key={filter.label}
              label={filter.label}
              selected={status === filter.value}
              onPress={() => setStatus(filter.value)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(order) => order.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl
            refreshing={ordersQuery.isRefetching}
            onRefresh={() => ordersQuery.refetch()}
          />
        }
        onEndReached={() => {
          if (
            !ordersQuery.hasNextPage ||
            ordersQuery.isFetchingNextPage ||
            ordersQuery.isLoading
          ) {
            return;
          }

          ordersQuery.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => router.push(`/order/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          ordersQuery.isLoading ? (
            <View className="gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <OrderCardSkeleton key={i} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="ClipboardList"
              title="No orders found"
              message={
                ordersQuery.isError
                  ? ordersQuery.error.message
                  : "Orders you create will show up here."
              }
              actionLabel={ordersQuery.isError ? "Retry" : "New Order"}
              onAction={
                ordersQuery.isError
                  ? () => ordersQuery.refetch()
                  : () => router.push("/new-order/table")
              }
            />
          )
        }
        ListFooterComponent={
          ordersQuery.isFetchingNextPage ? (
            <View className="items-center justify-center py-6">
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : null
        }
      />

      {/* Floating action button */}
      <Pressable
        onPress={() => router.push("/new-order/table")}
        className="absolute bottom-6 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-black/25 active:opacity-85"
      >
        <Icon
          name="Plus"
          size={26}
          color={theme.primaryForeground}
          onPress={() => router.push("/new-order/table")}
        />
      </Pressable>
    </View>
  );
}
