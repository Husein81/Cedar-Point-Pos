import Provider from "@/components/provider";
import { THEME } from "@/lib/theme";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";
import "../global.css";

function RootLayoutNav() {
  const { isAuthenticated, hasHydrated } = useAuthStore();

  // Splash gate: wait for the persisted session to restore so an existing
  // session never flashes the sign-in screen.
  if (!hasHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)/sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="order/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="new-order/table"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen
          name="new-order/menu"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen
          name="new-order/cart"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen
          name="profile"
          options={{ headerShown: false, presentation: "modal" }}
        />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const { isDark, initializeTheme } = useThemeStore();

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  return (
    <Provider>
      <RootLayoutNav />
      <StatusBar
        style={"auto"}
        backgroundColor={
          isDark ? THEME.dark.background : THEME.light.background
        }
      />
      <PortalHost />
    </Provider>
  );
}
