import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { formatMoney, formatTime } from "@/lib/format";
import { useAppTheme } from "@/lib/theme";
import type { Order } from "@/types";
import { StatusBadge } from "./status-badge";

type Props = {
  order: Order;
  onPress: () => void;
};

export const OrderCard = ({ order, onPress }: Props) => {
  const { mutedForeground: mutedColor } = useAppTheme();

  const itemCount =
    order.items?.reduce((sum, item) => sum + Number(item.quantity), 0) ?? 0;

  return (
    <Pressable
      onPress={onPress}
      className="bg-card border-border rounded-xl border p-4 gap-3 active:opacity-80"
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-bold text-base">#{order.orderNumber}</Text>
        <StatusBadge status={order.status} />
      </View>

      <View className="flex-row items-center gap-4">
        {order.table?.name ? (
          <View className="flex-row items-center gap-1.5">
            <Icon name="Utensils" size={14} color={mutedColor} />
            <Text className="text-muted-foreground text-sm">
              {order.table.name}
            </Text>
          </View>
        ) : null}
        <View className="flex-row items-center gap-1.5">
          <Icon name="ShoppingBag" size={14} color={mutedColor} />
          <Text className="text-muted-foreground text-sm">
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Icon name="Clock" size={14} color={mutedColor} />
          <Text className="text-muted-foreground text-sm">
            {formatTime(order.createdAt)}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between border-t border-border pt-3">
        <Text className="text-muted-foreground text-sm">
          {order.user?.name ?? ""}
        </Text>
        <Text className="font-bold text-primary text-base">
          {formatMoney(order.total)}
        </Text>
      </View>
    </Pressable>
  );
};
