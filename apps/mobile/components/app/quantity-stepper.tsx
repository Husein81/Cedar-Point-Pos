import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { useThemeStore } from "@/store/theme";
import { THEME } from "@/lib/theme";

type Props = {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
};

export const QuantityStepper = ({
  quantity,
  onIncrease,
  onDecrease,
}: Props) => {
  const { isDark } = useThemeStore();
  const iconColor = isDark ? THEME.dark.foreground : THEME.light.foreground;

  return (
    <View className="flex-row items-center gap-3">
      <Pressable
        onPress={onDecrease}
        className="h-8 w-8 items-center justify-center rounded-full bg-muted active:opacity-70"
      >
        <Icon
          name={quantity <= 1 ? "Trash2" : "Minus"}
          size={16}
          color={iconColor}
          onPress={onDecrease}
        />
      </Pressable>
      <Text className="min-w-6 text-center font-bold">{quantity}</Text>
      <Pressable
        onPress={onIncrease}
        className="h-8 w-8 items-center justify-center rounded-full bg-primary active:opacity-70"
      >
        <Icon
          name="Plus"
          size={16}
          color={
            isDark
              ? THEME.dark.primaryForeground
              : THEME.light.primaryForeground
          }
          onPress={onIncrease}
        />
      </Pressable>
    </View>
  );
};
