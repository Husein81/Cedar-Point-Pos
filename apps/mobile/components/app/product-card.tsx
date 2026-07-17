import { Image } from "expo-image";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { formatMoney } from "@/lib/format";
import { useThemeStore } from "@/store/theme";
import { THEME } from "@/lib/theme";
import type { Product } from "@/types";
import { QuantityStepper } from "./quantity-stepper";

type Props = {
  product: Product;
  /** Quantity of this product currently in the cart (0 = not added). */
  quantity: number;
  onAdd: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
};

export const ProductCard = ({
  product,
  quantity,
  onAdd,
  onIncrease,
  onDecrease,
}: Props) => {
  const { isDark } = useThemeStore();
  const theme = isDark ? THEME.dark : THEME.light;

  return (
    <View className="flex-1 bg-card border-border rounded-xl border overflow-hidden">
      <Pressable onPress={onAdd} className="active:opacity-80">
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={{ width: "100%", height: 96 }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="h-24 w-full items-center justify-center bg-muted">
            <Icon
              name="UtensilsCrossed"
              size={28}
              color={theme.mutedForeground}
            />
          </View>
        )}
        <View className="p-3 gap-1">
          <Text className="font-semibold text-sm" numberOfLines={1}>
            {product.name}
          </Text>
          <Text className="text-primary font-bold text-sm">
            {formatMoney(product.price)}
          </Text>
        </View>
      </Pressable>

      <View className="px-3 pb-3">
        {quantity > 0 ? (
          <View className="items-center">
            <QuantityStepper
              quantity={quantity}
              onIncrease={onIncrease}
              onDecrease={onDecrease}
            />
          </View>
        ) : (
          <Pressable
            onPress={onAdd}
            className="flex-row items-center justify-center gap-1 rounded-lg bg-primary/10 py-2 active:opacity-70"
          >
            <Icon name="Plus" size={14} color={theme.primary} onPress={onAdd} />
            <Text className="text-primary text-sm font-semibold">Add</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};
