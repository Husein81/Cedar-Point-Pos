import { OrderStatus } from "@repo/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState, ScreenHeader, StatusBadge } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
  useOrder,
  useSendToKitchen,
  useUpdateOrderStatus,
} from "@/hooks/use-orders";
import { formatDateTime, formatMoney, toNumber } from "@/lib/format";
import { THEME } from "@/lib/theme";
import { useCartStore } from "@/store/cart";
import { useThemeStore } from "@/store/theme";

const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
  OrderStatus.PARTIALLY_REFUNDED,
  OrderStatus.FULLY_REFUNDED,
];

export default function OrderDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useThemeStore();
  const theme = isDark ? THEME.dark : THEME.light;

  const orderQuery = useOrder(id);
  const sendToKitchen = useSendToKitchen();
  const updateStatus = useUpdateOrderStatus();
  const clearCart = useCartStore((state) => state.clear);

  const order = orderQuery.data;
  const isActing = sendToKitchen.isPending || updateStatus.isPending;

  const showError = (error: unknown) => {
    Alert.alert(
      "Something went wrong",
      error instanceof Error ? error.message : "Please try again.",
    );
  };

  const handleSendToKitchen = async () => {
    if (!order) return;
    try {
      await sendToKitchen.mutateAsync(order.id);
    } catch (error) {
      showError(error);
    }
  };

  const handleCancel = () => {
    if (!order) return;
    Alert.alert(
      "Cancel this order?",
      `Order #${order.orderNumber} will be cancelled.`,
      [
        { text: "Keep Order", style: "cancel" },
        {
          text: "Cancel Order",
          style: "destructive",
          onPress: async () => {
            try {
              await updateStatus.mutateAsync({
                id: order.id,
                status: OrderStatus.CANCELLED,
              });
            } catch (error) {
              showError(error);
            }
          },
        },
      ],
    );
  };

  const handleAddItems = () => {
    if (!order) return;
    clearCart();
    router.push({ pathname: "/new-order/menu", params: { orderId: order.id } });
  };

  if (orderQuery.isLoading) {
    return (
      <View className="flex-1 bg-background">
        <ScreenHeader title="Order" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View className="flex-1 bg-background">
        <ScreenHeader title="Order" />
        <EmptyState
          icon="FileQuestion"
          title="Order not found"
          message={orderQuery.error?.message}
          actionLabel="Retry"
          onAction={() => orderQuery.refetch()}
        />
      </View>
    );
  }

  const paidAmount = (order.payments ?? []).reduce(
    (sum, payment) => sum + toNumber(payment.amount),
    0,
  );
  const isTerminal = TERMINAL_STATUSES.includes(order.status);
  console.log("order", order.user);
  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title={`Order #${order.orderNumber}`}
        subtitle={formatDateTime(order.createdAt)}
        right={<StatusBadge status={order.status} />}
        showBack={true}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={orderQuery.isRefetching}
            onRefresh={() => orderQuery.refetch()}
          />
        }
      >
        {/* Meta */}
        <View className="bg-card border-border rounded-xl border p-4 gap-3">
          {order.table?.name ? (
            <View className="flex-row items-center gap-2">
              <Icon name="Armchair" size={16} color={theme.mutedForeground} />
              <Text className="text-sm">{order.table.name}</Text>
              {order.guestCount ? (
                <Text className="text-muted-foreground text-sm">
                  · {order.guestCount} guest{order.guestCount === 1 ? "" : "s"}
                </Text>
              ) : null}
            </View>
          ) : null}
          {order.user?.name ? (
            <View className="flex-row items-center gap-2">
              <Icon
                name="CircleUserRound"
                size={16}
                color={theme.mutedForeground}
              />
              <Text className="text-sm">Served by {order.user.name}</Text>
            </View>
          ) : null}
          {order.customer?.name ? (
            <View className="flex-row items-center gap-2">
              <Icon name="Contact" size={16} color={theme.mutedForeground} />
              <Text className="text-sm">{order.customer.name}</Text>
            </View>
          ) : null}
        </View>

        {/* Items */}
        <View className="bg-card border-border rounded-xl border p-4 gap-3">
          <Text className="font-bold">Items</Text>
          {(order.items ?? []).map((item) => (
            <View key={item.id} className="gap-0.5">
              <View className="flex-row items-start justify-between gap-3">
                <Text className="flex-1 text-sm">
                  {item.quantity} × {item.product?.name ?? "Item"}
                </Text>
                <Text className="text-sm font-semibold">
                  {formatMoney(item.total)}
                </Text>
              </View>
              {item.notes ? (
                <Text className="text-muted-foreground text-xs italic">
                  “{item.notes}”
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* Totals */}
        <View className="bg-card border-border rounded-xl border p-4 gap-2">
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground">Subtotal</Text>
            <Text>{formatMoney(order.subtotal)}</Text>
          </View>
          {toNumber(order.discount) > 0 ? (
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">Discount</Text>
              <Text className="text-destructive">
                -{formatMoney(order.discount)}
              </Text>
            </View>
          ) : null}
          {toNumber(order.vat) > 0 ? (
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">VAT</Text>
              <Text>{formatMoney(order.vat)}</Text>
            </View>
          ) : null}
          <View className="flex-row justify-between border-t border-border pt-2">
            <Text className="font-bold">Total</Text>
            <Text className="font-bold text-primary">
              {formatMoney(order.total)}
            </Text>
          </View>
          {paidAmount > 0 ? (
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">Paid</Text>
              <Text className="text-success">{formatMoney(paidAmount)}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Actions */}
      {!isTerminal ? (
        <View
          className="border-t border-border bg-background px-4 pt-3 gap-2"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          {order.status === OrderStatus.DRAFT ? (
            <Button
              onPress={handleSendToKitchen}
              disabled={isActing}
              className="h-14 rounded-xl"
            >
              {sendToKitchen.isPending ? (
                <ActivityIndicator color={theme.primaryForeground} />
              ) : (
                <View className="flex-row items-center gap-2">
                  <Icon
                    name="ChefHat"
                    size={18}
                    color={theme.primaryForeground}
                  />
                  <Text className="font-semibold text-base">
                    Send to Kitchen
                  </Text>
                </View>
              )}
            </Button>
          ) : null}
          <View className="flex-row gap-2">
            <Button
              variant="outline"
              onPress={handleAddItems}
              disabled={isActing}
              className="h-12 flex-1 rounded-xl"
            >
              <Text>Add Items</Text>
            </Button>
            <Button
              variant="destructive"
              onPress={handleCancel}
              disabled={isActing}
              className="h-12 flex-1 rounded-xl"
            >
              <Text className="text-white">Cancel Order</Text>
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}
