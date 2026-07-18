import React from "react";
import { Pressable, ScrollView, View } from "react-native";

import { ScreenHeader } from "@/components/app";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { THEME_BY_COLOR, useAppTheme } from "@/lib/theme";
import { COLOR_THEME_OPTIONS, THEME_MODE_OPTIONS } from "@/lib/theme-options";
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

const ColorThemeRow = ({
  option,
  isActive,
  onPress,
}: {
  option: (typeof COLOR_THEME_OPTIONS)[number];
  isActive: boolean;
  onPress: () => void;
}) => {
  const theme = useAppTheme();
  const swatch = THEME_BY_COLOR[option.value].light;

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-3 rounded-xl border-2 p-4 active:opacity-80",
        isActive ? "border-primary" : "border-border",
      )}
    >
      <View className="flex-row -space-x-1.5">
        <View
          className="h-6 w-6 rounded-full"
          style={{
            backgroundColor: swatch.primary,
            borderWidth: 2,
            borderColor: theme.background,
          }}
        />
        <View
          className="h-6 w-6 rounded-full"
          style={{
            backgroundColor: swatch.accent,
            borderWidth: 2,
            borderColor: theme.background,
          }}
        />
      </View>
      <View className="flex-1">
        <Text className="font-medium">{option.label}</Text>
        <Text className="text-muted-foreground text-xs">
          {option.description}
        </Text>
      </View>
      {isActive && <Icon name="CircleCheck" size={20} color={theme.primary} />}
    </Pressable>
  );
};

export default function ThemesScreen() {
  const { theme: mode, colorTheme, setTheme, setColorTheme } = useThemeStore();

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

        <View className="gap-3">
          <View>
            <Text className="font-semibold">Color theme</Text>
            <Text className="text-muted-foreground text-sm">
              Pick the accent color used across the app
            </Text>
          </View>
          <View className="gap-2">
            {COLOR_THEME_OPTIONS.map((option) => (
              <ColorThemeRow
                key={option.value}
                option={option}
                isActive={colorTheme === option.value}
                onPress={() => setColorTheme(option.value)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
