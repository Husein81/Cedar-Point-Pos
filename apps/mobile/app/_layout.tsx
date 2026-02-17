import Provider from "@/components/provider";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View } from "react-native";
import "react-native-reanimated";
import "../global.css";

function RootLayoutNav() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Stack>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)/sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const { isDark } = useThemeStore();
  return (
    <Provider>
      <RootLayoutNav />
      <StatusBar style={isDark ? "light" : "dark"} />
      <PortalHost />
    </Provider>
  );
}
