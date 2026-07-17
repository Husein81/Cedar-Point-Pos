import Constants from "expo-constants";
import React from "react";
import { Appearance, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Chip } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useLogout } from "@/hooks/use-auth";
import { API_URL } from "@/lib/api";
import { useThemeStore } from "@/store/theme";

const THEME_OPTIONS = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
] as const;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, setTheme } = useThemeStore();
  const logout = useLogout();

  const handleTheme = (value: "light" | "dark") => {
    setTheme(value);
    Appearance.setColorScheme(value);
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 16,
        paddingBottom: 32,
        gap: 20,
      }}
    >
      <Text className="text-2xl font-bold">Settings</Text>

      {/* Appearance */}
      <View className="bg-card border-border rounded-xl border p-4 gap-3">
        <Text className="font-semibold">Appearance</Text>
        <View className="flex-row gap-2">
          {THEME_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={theme === option.value}
              onPress={() => handleTheme(option.value)}
            />
          ))}
        </View>
      </View>

      {/* About */}
      <View className="bg-card border-border rounded-xl border p-4 gap-3">
        <Text className="font-semibold">About</Text>
        <View className="flex-row justify-between">
          <Text className="text-muted-foreground text-sm">Version</Text>
          <Text className="text-sm">
            {Constants.expoConfig?.version ?? "1.0.0"}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-muted-foreground text-sm">Server</Text>
          <Text className="text-sm" numberOfLines={1}>
            {API_URL}
          </Text>
        </View>
      </View>

      <Button
        variant="outline"
        onPress={() => logout.mutate()}
        disabled={logout.isPending}
        className="h-12 rounded-xl"
      >
        <Text>Log Out</Text>
      </Button>
    </ScrollView>
  );
}
