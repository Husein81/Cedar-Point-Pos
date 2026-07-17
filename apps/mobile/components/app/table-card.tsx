import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { formatMoney, tableStatusStyle } from "@/lib/format";
import { useThemeStore } from "@/store/theme";
import { THEME } from "@/lib/theme";
import type { TableOverview } from "@/types";

type Props = {
  table: TableOverview;
  onPress: () => void;
};

export const TableCard = ({ table, onPress }: Props) => {
  const { isDark } = useThemeStore();
  const mutedColor = isDark
    ? THEME.dark.mutedForeground
    : THEME.light.mutedForeground;
  const style = tableStatusStyle(table.status);

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "flex-1 rounded-xl border p-4 gap-2 active:opacity-80",
        style.badge,
      )}
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-bold text-base">{table.name}</Text>
        <View className="flex-row items-center gap-1">
          <Icon name="Users" size={13} color={mutedColor} />
          <Text className="text-muted-foreground text-xs">
            {table.capacity}
          </Text>
        </View>
      </View>

      <Text className={cn("text-xs font-semibold", style.text)}>
        {style.label}
      </Text>

      {table.activeOrder ? (
        <View className="border-t border-border pt-2 gap-0.5">
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            #{table.activeOrder.orderNumber} ·{" "}
            {table.activeOrder.itemCount} items
          </Text>
          <Text className="text-sm font-bold">
            {formatMoney(table.activeOrder.total)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
};
