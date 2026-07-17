import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/store/theme";
import { THEME } from "@/lib/theme";

type Props = {
  icon: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const EmptyState = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: Props) => {
  const { isDark } = useThemeStore();
  const mutedColor = isDark
    ? THEME.dark.mutedForeground
    : THEME.light.mutedForeground;

  return (
    <View className="flex-1 items-center justify-center gap-3 px-8 py-16">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon name={icon} size={28} color={mutedColor} />
      </View>
      <Text className="font-semibold text-base text-center">{title}</Text>
      {message ? (
        <Text className="text-muted-foreground text-sm text-center">
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="outline" size="sm" onPress={onAction} className="mt-2">
          <Text>{actionLabel}</Text>
        </Button>
      ) : null}
    </View>
  );
};
