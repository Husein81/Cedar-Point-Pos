import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { useThemeStore } from "@/store/theme";
import { THEME } from "@/lib/theme";

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  showBack?: boolean;
};

export const ScreenHeader = ({
  title,
  subtitle,
  right,
  showBack = true,
}: Props) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const iconColor = isDark ? THEME.dark.foreground : THEME.light.foreground;

  return (
    <View
      className="flex-row items-center gap-3 bg-background px-4 pb-3 border-b border-border"
      style={{ paddingTop: insets.top + 8 }}
    >
      {showBack && router.canGoBack() ? (
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-card border border-border active:opacity-70"
        >
          <Icon
            name="ChevronLeft"
            size={20}
            color={iconColor}
            onPress={() => router.back()}
          />
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.push("/")}
          className="h-10 w-10 items-center justify-center rounded-full bg-card border border-border active:opacity-70"
        >
          <Icon
            name="ChevronLeft"
            size={20}
            color={iconColor}
            onPress={() => router.push("/")}
          />
        </Pressable>
      )}
      <View className="flex-1">
        <Text className="text-lg font-bold" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-muted-foreground text-xs" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
};
