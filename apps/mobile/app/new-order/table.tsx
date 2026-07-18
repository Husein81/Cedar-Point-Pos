import { OrderType, TableStatus } from "@repo/types";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";

import {
  EmptyState,
  ScreenHeader,
  TableCard,
  TableCardSkeleton,
} from "@/components/app";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useTablesOverview } from "@/hooks/use-tables";
import { THEME } from "@/lib/theme";
import { useBranchStore } from "@/store/branch";
import { useCartStore } from "@/store/cart";
import { useThemeStore } from "@/store/theme";
import type { TableOverview } from "@/types";

export default function SelectTableScreen() {
  const router = useRouter();
  const { isDark } = useThemeStore();
  const theme = isDark ? THEME.dark : THEME.light;
  const { branchId, branchName } = useBranchStore();
  const startOrder = useCartStore((state) => state.startOrder);

  const tablesQuery = useTablesOverview(branchId);

  const floors = useMemo(() => {
    const tables = tablesQuery.data ?? [];
    const grouped = new Map<string, TableOverview[]>();
    for (const table of tables) {
      const floorName = table.floor?.name ?? "Main Floor";
      const group = grouped.get(floorName) ?? [];
      group.push(table);
      grouped.set(floorName, group);
    }
    return Array.from(grouped.entries());
  }, [tablesQuery.data]);

  const handleTablePress = (table: TableOverview) => {
    // An in-service table opens its running order instead of a new cart.
    if (table.activeOrder) {
      router.push(`/order/${table.activeOrder.orderId}`);
      return;
    }
    if (table.status === TableStatus.RESERVED) return;

    startOrder({
      orderType: OrderType.DINE_IN,
      tableId: table.id,
      tableName: table.name,
    });
    router.push("/new-order/menu");
  };

  const handleTakeaway = () => {
    startOrder({ orderType: OrderType.TAKEAWAY });
    router.push("/new-order/menu");
  };

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title="Select Table"
        subtitle={branchName ?? undefined}
        right={
          <Pressable
            onPress={handleTakeaway}
            className="flex-row items-center gap-1.5 rounded-full bg-primary px-4 py-2 active:opacity-85"
          >
            <Icon
              name="ShoppingBag"
              size={14}
              color={theme.primaryForeground}
            />
            <Text className="text-primary-foreground text-sm font-semibold">
              Takeaway
            </Text>
          </Pressable>
        }
      />

      {tablesQuery.isLoading ? (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
        >
          <View className="gap-3">
            <View className="flex-row flex-wrap gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} className="w-[47.5%]">
                  <TableCardSkeleton />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={tablesQuery.isRefetching}
              onRefresh={() => tablesQuery.refetch()}
            />
          }
        >
          {floors.length === 0 ? (
            <EmptyState
              icon="Utensils"
              title="No tables in this branch"
              message={
                tablesQuery.isError
                  ? tablesQuery.error.message
                  : "You can still start a takeaway order."
              }
              actionLabel="Start Takeaway"
              onAction={handleTakeaway}
            />
          ) : (
            floors.map(([floorName, tables]) => (
              <View key={floorName} className="gap-3">
                <Text className="text-muted-foreground text-sm font-semibold uppercase">
                  {floorName}
                </Text>
                <View className="flex-row flex-wrap gap-3">
                  {tables.map((table) => (
                    <View key={table.id} className="w-[47.5%]">
                      <TableCard
                        table={table}
                        onPress={() => handleTablePress(table)}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
