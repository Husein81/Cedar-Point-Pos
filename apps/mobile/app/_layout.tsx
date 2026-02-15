import Provider from "@/components/provider";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "../global.css";
import { useThemeStore } from "@/store/theme";

export default function RootLayout() {
  const { theme, isDark } = useThemeStore();
  return (
    <Provider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
      <PortalHost />
    </Provider>
  );
}
