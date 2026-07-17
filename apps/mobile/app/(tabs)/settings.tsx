import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Chip } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useLogout } from "@/hooks/use-auth";
import { API_URL } from "@/lib/api";
import { THEME } from "@/lib/theme";
import { useThemeStore } from "@/store/theme";

const THEME_OPTIONS = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const { theme, setTheme } = useThemeStore();

  const themeColors = isDark ? THEME.dark : THEME.light;

  const logout = useLogout();

  const handleTheme = (value: "light" | "dark") => {
    setTheme(value);
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

      {/* Profile */}
      <Pressable
        onPress={() => router.push("/profile")}
        className="bg-card border-border rounded-xl border p-4 active:opacity-80"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
              <Icon name="User" size={18} color={themeColors.primary} />
            </View>
            <Text className="font-semibold">My Profile</Text>
          </View>
          <Icon
            name="ChevronRight"
            size={20}
            color={themeColors.mutedForeground}
          />
        </View>
      </Pressable>

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
      </View>

      <Button
        variant="destructive"
        onPress={() => logout.mutate()}
        disabled={logout.isPending}
        className="h-12 rounded-xl"
      >
        <Icon
          name="LogOut"
          className="text-white"
          color="white"
          onPress={() => logout.mutate()}
        />
        <Text>Log Out</Text>
      </Button>
    </ScrollView>
  );
}
