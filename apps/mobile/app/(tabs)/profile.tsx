import Constants from "expo-constants";
import React from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useLogout } from "@/hooks/use-auth";
import { initialsOf } from "@/lib/format";
import { THEME } from "@/lib/theme";
import { useAuthStore } from "@/store/auth";
import { useBranchStore } from "@/store/branch";
import { useThemeStore } from "@/store/theme";

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const { isDark } = useThemeStore();
  const mutedColor = isDark
    ? THEME.dark.mutedForeground
    : THEME.light.mutedForeground;

  return (
    <View className="flex-row items-center gap-3 py-3">
      <View className="h-9 w-9 items-center justify-center rounded-lg bg-muted">
        <Icon name={icon} size={16} color={mutedColor} />
      </View>
      <View className="flex-1">
        <Text className="text-muted-foreground text-xs">{label}</Text>
        <Text className="text-sm font-medium">{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { branchName } = useBranchStore();
  const logout = useLogout();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingHorizontal: 16,
        paddingBottom: 32,
        gap: 20,
      }}
    >
      {/* Identity */}
      <View className="items-center gap-3">
        <View className="h-24 w-24 items-center justify-center rounded-full bg-primary/15">
          <Text className="text-primary text-3xl font-bold">
            {initialsOf(user?.name)}
          </Text>
        </View>
        <View className="items-center gap-1">
          <Text className="text-xl font-bold">{user?.name}</Text>
          <View className="rounded-full bg-primary/10 px-3 py-1">
            <Text className="text-primary text-xs font-semibold">
              {user?.role}
            </Text>
          </View>
        </View>
      </View>

      {/* Details */}
      <View className="bg-card border-border rounded-xl border px-4">
        <InfoRow
          icon="AtSign"
          label="Username"
          value={user?.username ?? "—"}
        />
        <View className="h-px bg-border" />
        <InfoRow icon="Mail" label="Email" value={user?.email ?? "—"} />
        <View className="h-px bg-border" />
        <InfoRow icon="Phone" label="Phone" value={user?.phone ?? "—"} />
        <View className="h-px bg-border" />
        <InfoRow icon="Store" label="Branch" value={branchName ?? "—"} />
      </View>

      <Button
        variant="destructive"
        onPress={() => logout.mutate()}
        disabled={logout.isPending}
        className="h-12 rounded-xl"
      >
        {logout.isPending ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-semibold">Log Out</Text>
        )}
      </Button>

      <Text className="text-muted-foreground text-center text-xs">
        CedarPoint Mobile v{Constants.expoConfig?.version ?? "1.0.0"}
      </Text>
    </ScrollView>
  );
}
