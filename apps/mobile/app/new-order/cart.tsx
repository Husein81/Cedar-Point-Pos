import { OrderType } from "@repo/types";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState, QuantityStepper, ScreenHeader } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import {
  useBatchAddItems,
  useCreateOrder,
  useSendToKitchen,
} from "@/hooks/use-orders";
import { formatMoney } from "@/lib/format";
import { THEME } from "@/lib/theme";
import { useBranchStore } from "@/store/branch";
import {
  selectCartSubtotal,
  selectCartTotal,
  selectCartVat,
  useCartStore,
} from "@/store/cart";
import { useThemeStore } from "@/store/theme";

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const theme = isDark ? THEME.dark : THEME.light;

  /** When set, the cart is being appended to an existing order. */
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const { branchId } = useBranchStore();

  const cart = useCartStore();
  const subtotal = useCartStore(selectCartSubtotal);
  const vat = useCartStore(selectCartVat);
  const total = useCartStore(selectCartTotal);

  const createOrder = useCreateOrder();
  const sendToKitchen = useSendToKitchen();
  const batchAddItems = useBatchAddItems();

  const isSubmitting =
    createOrder.isPending || sendToKitchen.isPending || batchAddItems.isPending;

  const cartItemsToInput = () =>
    cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      ...(item.notes?.trim() ? { notes: item.notes.trim() } : {}),
    }));

  const showError = (error: unknown) => {
    Alert.alert(
      "Something went wrong",
      error instanceof Error ? error.message : "Please try again.",
    );
  };

  const finish = async (createdOrderId: string) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    cart.clear();
    router.dismissAll();
    router.replace(`/order/${createdOrderId}`);
  };

  const handleAddToExistingOrder = async () => {
    if (!orderId) return;
    try {
      await batchAddItems.mutateAsync({ id: orderId, items: cartItemsToInput() });
      await finish(orderId);
    } catch (error) {
      showError(error);
    }
  };

  const createDraftOrder = async () => {
    if (!branchId) {
      Alert.alert("No branch selected", "Pick a branch on the Home screen first.");
      return null;
    }
    return createOrder.mutateAsync({
      branchId,
      type: cart.orderType,
      tableId: cart.tableId ?? undefined,
      guestCount:
        cart.orderType === OrderType.DINE_IN ? cart.guestCount : undefined,
      includeVAT: cart.includeVAT,
      items: cartItemsToInput(),
    });
  };

  const handleSaveDraft = async () => {
    try {
      const order = await createDraftOrder();
      if (order) await finish(order.id);
    } catch (error) {
      showError(error);
    }
  };

  const handleSendToKitchen = async () => {
    try {
      const order = await createDraftOrder();
      if (!order) return;
      await sendToKitchen.mutateAsync(order.id);
      await finish(order.id);
    } catch (error) {
      showError(error);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title={orderId ? "Add to Order" : "Review Order"}
        subtitle={cart.tableName ?? undefined}
      />

      {cart.items.length === 0 ? (
        <EmptyState
          icon="ShoppingCart"
          title="Your cart is empty"
          message="Add items from the menu to get started."
          actionLabel="Browse Menu"
          onAction={() => router.back()}
        />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
          >
            {cart.items.map((item) => (
              <View
                key={item.productId}
                className="bg-card border-border rounded-xl border p-4 gap-3"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="font-semibold" numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text className="text-muted-foreground text-sm">
                      {formatMoney(item.unitPrice)} each
                    </Text>
                  </View>
                  <Text className="font-bold text-primary">
                    {formatMoney(item.unitPrice * item.quantity)}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between gap-3">
                  <QuantityStepper
                    quantity={item.quantity}
                    onIncrease={() =>
                      cart.setQuantity(item.productId, item.quantity + 1)
                    }
                    onDecrease={() =>
                      cart.setQuantity(item.productId, item.quantity - 1)
                    }
                  />
                  <Pressable
                    onPress={() => cart.removeItem(item.productId)}
                    className="h-8 w-8 items-center justify-center rounded-full bg-destructive/10 active:opacity-70"
                  >
                    <Icon name="Trash2" size={15} color={theme.destructive} />
                  </Pressable>
                </View>

                <Input
                  value={item.notes ?? ""}
                  onChangeText={(notes) => cart.setNotes(item.productId, notes)}
                  placeholder="Special instructions..."
                  placeholderTextColor={theme.mutedForeground}
                  className="h-10 rounded-lg text-sm"
                />
              </View>
            ))}

            {/* Order options (new orders only) */}
            {!orderId ? (
              <View className="bg-card border-border rounded-xl border p-4 gap-4">
                {cart.orderType === OrderType.DINE_IN ? (
                  <View className="flex-row items-center justify-between">
                    <Text className="font-medium">Guests</Text>
                    <QuantityStepper
                      quantity={cart.guestCount}
                      onIncrease={() => cart.setGuestCount(cart.guestCount + 1)}
                      onDecrease={() => cart.setGuestCount(cart.guestCount - 1)}
                    />
                  </View>
                ) : null}
                <View className="flex-row items-center justify-between">
                  <Text className="font-medium">Include VAT (11%)</Text>
                  <Switch
                    checked={cart.includeVAT}
                    onCheckedChange={() => cart.toggleVAT()}
                  />
                </View>
              </View>
            ) : null}

            {/* Totals */}
            <View className="bg-card border-border rounded-xl border p-4 gap-2">
              <View className="flex-row justify-between">
                <Text className="text-muted-foreground">Subtotal</Text>
                <Text>{formatMoney(subtotal)}</Text>
              </View>
              {cart.includeVAT && !orderId ? (
                <View className="flex-row justify-between">
                  <Text className="text-muted-foreground">VAT (11%)</Text>
                  <Text>{formatMoney(vat)}</Text>
                </View>
              ) : null}
              <View className="flex-row justify-between border-t border-border pt-2">
                <Text className="font-bold">Total</Text>
                <Text className="font-bold text-primary">
                  {formatMoney(orderId ? subtotal : total)}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View
            className="border-t border-border bg-background px-4 pt-3 gap-2"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            {orderId ? (
              <Button
                onPress={handleAddToExistingOrder}
                disabled={isSubmitting}
                className="h-14 rounded-xl"
              >
                {isSubmitting ? (
                  <ActivityIndicator color={theme.primaryForeground} />
                ) : (
                  <Text className="font-semibold text-base">Add to Order</Text>
                )}
              </Button>
            ) : (
              <>
                <Button
                  onPress={handleSendToKitchen}
                  disabled={isSubmitting}
                  className="h-14 rounded-xl"
                >
                  {isSubmitting ? (
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
                <Button
                  variant="outline"
                  onPress={handleSaveDraft}
                  disabled={isSubmitting}
                  className="h-12 rounded-xl"
                >
                  <Text>Save as Draft</Text>
                </Button>
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
}
