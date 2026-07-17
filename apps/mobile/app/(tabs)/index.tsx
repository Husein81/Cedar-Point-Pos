import { OrderStatus } from "@repo/types";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Chip, OrderCard, StatCard } from "@/components/app";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useBranches } from "@/hooks/use-branches";
import { useOrders } from "@/hooks/use-orders";
import { formatMoney, initialsOf, toNumber } from "@/lib/format";
import { THEME } from "@/lib/theme";
import { useAuthStore } from "@/store/auth";
import { useBranchStore } from "@/store/branch";
import { useThemeStore } from "@/store/theme";

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.DRAFT,
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.IN_PROGRESS,
  OrderStatus.SENT_TO_KITCHEN,
  OrderStatus.READY,
];

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const theme = isDark ? THEME.dark : THEME.light;

  const { branchId, setBranch } = useBranchStore();
  const branches = useBranches();

  useEffect(() => {
    if (branchId || !branches.data?.length) return;
    const preferred =
      branches.data.find((b) => b.id === user?.branchId) ?? branches.data[0];
    if (preferred) setBranch({ id: preferred.id, name: preferred.name });
  }, [branchId, branches.data, setBranch, user?.branchId]);

  const ordersQuery = useOrders({
    branchId: branchId ?? undefined,
    startDate: startOfToday(),
    limit: 50,
  });

  const orders = useMemo(
    () => ordersQuery.data?.data ?? [],
    [ordersQuery.data],
  );

  const stats = useMemo(() => {
    const active = orders.filter((o) =>
      ACTIVE_STATUSES.includes(o.status),
    ).length;
    const revenue = orders
      .filter(
        (o) =>
          o.status === OrderStatus.PAID || o.status === OrderStatus.COMPLETED,
      )
      .reduce((sum, o) => sum + toNumber(o.total), 0);
    return { total: orders.length, active, revenue };
  }, [orders]);

  const recentOrders = orders.slice(0, 5);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: 32,
        paddingHorizontal: 16,
        gap: 20,
      }}
      refreshControl={
        <RefreshControl
          refreshing={ordersQuery.isRefetching}
          onRefresh={() => ordersQuery.refetch()}
        />
      }
    >
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-muted-foreground text-sm">Welcome back,</Text>
          <Text className="text-2xl font-bold">{user?.name}</Text>
        </View>
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/15">
          <Text className="text-primary font-bold">
            {initialsOf(user?.name)}
          </Text>
        </View>
      </View>

      {/* Branch selector */}
      {branches.data && branches.data.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {branches.data.map((branch) => (
            <Chip
              key={branch.id}
              label={branch.name}
              selected={branch.id === branchId}
              onPress={() => setBranch({ id: branch.id, name: branch.name })}
            />
          ))}
        </ScrollView>
      ) : null}

      {/* Stats */}
      <View className="flex-row flex-wrap gap-3">
        <StatCard
          icon="ClipboardList"
          label="Today's Orders"
          value={String(stats.total)}
        />
        <StatCard icon="Flame" label="Active" value={String(stats.active)} />
        <StatCard
          icon="Banknote"
          label="Revenue"
          value={formatMoney(stats.revenue)}
        />
      </View>

      {/* Quick actions */}
      <View className="flex-row gap-3">
        <Pressable
          onPress={() => router.push("/new-order/table")}
          className="flex-1 items-center gap-2 rounded-xl bg-primary p-5 active:opacity-85"
        >
          <Icon name="Plus" size={24} color={theme.primaryForeground} />
          <Text className="text-primary-foreground font-semibold">
            New Order
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(tabs)/orders")}
          className="flex-1 items-center gap-2 rounded-xl bg-card border border-border p-5 active:opacity-85"
        >
          <Icon name="Flame" size={24} color={theme.primary} />
          <Text className="font-semibold">Active Orders</Text>
        </Pressable>
      </View>

      {/* Recent orders */}
      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold">Recent Orders</Text>
          <Pressable onPress={() => router.push("/(tabs)/orders")}>
            <Text className="text-primary text-sm font-medium">See all</Text>
          </Pressable>
        </View>
        {recentOrders.length === 0 ? (
          <View className="items-center rounded-xl border border-dashed border-border p-8">
            <Text className="text-muted-foreground text-sm">
              No orders yet today
            </Text>
          </View>
        ) : (
          recentOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => router.push(`/order/${order.id}`)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}
