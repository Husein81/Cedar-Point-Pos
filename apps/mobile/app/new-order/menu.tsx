import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Chip,
  EmptyState,
  ProductCard,
  ScreenHeader,
  SearchBar,
} from "@/components/app";
import { Text } from "@/components/ui/text";
import { useCategories, useProducts } from "@/hooks/use-catalog";
import { formatMoney, toNumber } from "@/lib/format";
import { useBranchStore } from "@/store/branch";
import { selectCartCount, selectCartTotal, useCartStore } from "@/store/cart";

export default function MenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  /** When set, items are being added to an existing order. */
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();

  const { branchId } = useBranchStore();
  const cart = useCartStore();
  const cartCount = useCartStore(selectCartCount);
  const cartTotal = useCartStore(selectCartTotal);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

  const productsQuery = useProducts(branchId);
  const categoriesQuery = useCategories(branchId, search);

  const products = useMemo(() => {
    let list = productsQuery.data ?? [];
    if (categoryId) {
      list = list.filter(
        (p) => (p.categoryId ?? p.category?.id) === categoryId,
      );
    }
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter((p) => p.name.toLowerCase().includes(term));
    }
    return list;
  }, [productsQuery.data, categoryId, search]);

  const quantityFor = (productId: string) =>
    cart.items.find((item) => item.productId === productId)?.quantity ?? 0;

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title={orderId ? "Add Items" : (cart.tableName ?? "New Order")}
        subtitle={orderId ? undefined : cart.tableName ? "Dine in" : "Takeaway"}
      />

      <View className="gap-3 px-4 py-3">
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search menu..."
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <Chip
            label="All"
            selected={!categoryId}
            onPress={() => setCategoryId(undefined)}
          />
          {(categoriesQuery.data ?? []).map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              selected={categoryId === category.id}
              onPress={() => setCategoryId(category.id)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={products}
        keyExtractor={(product) => product.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 12,
          paddingBottom: 120,
        }}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            quantity={quantityFor(item.id)}
            onAdd={() =>
              cart.addItem({
                productId: item.id,
                name: item.name,
                unitPrice: toNumber(item.price),
                imageUrl: item.imageUrl,
              })
            }
            onIncrease={() =>
              cart.setQuantity(item.id, quantityFor(item.id) + 1)
            }
            onDecrease={() =>
              cart.setQuantity(item.id, quantityFor(item.id) - 1)
            }
          />
        )}
        ListEmptyComponent={
          productsQuery.isLoading ? null : (
            <EmptyState
              icon="UtensilsCrossed"
              title="No products found"
              message={
                productsQuery.isError
                  ? productsQuery.error.message
                  : "Try a different search or category."
              }
              actionLabel={productsQuery.isError ? "Retry" : undefined}
              onAction={
                productsQuery.isError
                  ? () => productsQuery.refetch()
                  : undefined
              }
            />
          )
        }
      />

      {/* Sticky cart summary */}
      {cartCount > 0 ? (
        <View
          className="absolute inset-x-0 bottom-0 px-4 pt-3"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <Pressable
            onPress={() =>
              router.push(
                orderId
                  ? { pathname: "/new-order/cart", params: { orderId } }
                  : "/new-order/cart",
              )
            }
            className="flex-row items-center justify-between rounded-xl bg-primary px-5 py-4 active:opacity-85"
          >
            <Text className="text-primary-foreground font-semibold">
              {cartCount} item{cartCount === 1 ? "" : "s"}
            </Text>
            <Text className="text-primary-foreground font-bold">
              View Cart · {formatMoney(cartTotal)}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
