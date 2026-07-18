import React from "react";
import { Pressable, ScrollView, View } from "react-native";

import { ScreenHeader } from "@/components/app";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/lib/theme";
import { THEME_MODE_OPTIONS } from "@/lib/theme-options";
import { useThemeStore } from "@/store/theme";
import { cn } from "@/lib/utils";

const ThemeModeCard = ({
  option,
  isActive,
  onPress,
}: {
  option: (typeof THEME_MODE_OPTIONS)[number];
  isActive: boolean;
  onPress: () => void;
}) => {
  const theme = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "flex-1 basis-[30%] gap-2 rounded-xl border-2 p-3 items-center active:opacity-80",
        isActive ? "border-primary" : "border-border",
      )}
    >
      <Icon
        name={option.icon}
        size={20}
        onPress={onPress}
        color={isActive ? theme.primary : theme.mutedForeground}
      />
      <Text
        className={cn(
          "text-xs font-semibold",
          isActive ? "text-primary" : "text-foreground",
        )}
      >
        {option.label}
      </Text>
    </Pressable>
  );
};

export default function ThemesScreen() {
  const { theme: mode, setTheme } = useThemeStore();

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Themes" subtitle="Appearance" />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 32 }}
      >
        <View className="gap-3">
          <View>
            <Text className="font-semibold">Mode</Text>
            <Text className="text-muted-foreground text-sm">
              Choose between light and dark appearance
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {THEME_MODE_OPTIONS.map((option) => (
              <ThemeModeCard
                key={option.value}
                option={option}
                isActive={mode === option.value}
                onPress={() => setTheme(option.value)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
