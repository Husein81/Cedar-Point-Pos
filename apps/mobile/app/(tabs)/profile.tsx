import Constants from "expo-constants";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Chip } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useLogout, useUpdateProfile } from "@/hooks/use-auth";
import { initialsOf } from "@/lib/format";
import { THEME } from "@/lib/theme";
import { useAuthStore } from "@/store/auth";
import { useBranchStore } from "@/store/branch";
import { useThemeStore } from "@/store/theme";
import { EditableInfoRow } from "@/components/form";

const THEME_OPTIONS = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
] as const;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { branchName } = useBranchStore();
  const { theme, setTheme } = useThemeStore();
  const logout = useLogout();
  const updateProfile = useUpdateProfile();

  const handleTheme = (value: "light" | "dark") => {
    setTheme(value);
  };

  const handleUpdateField = async (
    field: "username" | "email" | "phone",
    value: string,
  ) => {
    await updateProfile.mutateAsync({ id: user?.id!, [field]: value });
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
      <Text className="text-2xl font-bold">Profile</Text>

      {/* Profile Section */}
      <View className="items-center gap-3">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-primary/15">
          <Text className="text-primary text-2xl font-bold">
            {initialsOf(user?.name)}
          </Text>
        </View>
        <View className="items-center gap-1">
          <Text className="text-lg font-bold">{user?.name}</Text>
          <View className="rounded-full bg-primary/10 px-3 py-1">
            <Text className="text-primary text-xs font-semibold">
              {user?.role}
            </Text>
          </View>
        </View>
      </View>

      {/* Profile Details */}
      <View className="bg-card border-border rounded-xl border px-4">
        <EditableInfoRow
          icon="AtSign"
          label="Username"
          value={user?.username ?? "—"}
          editable={true}
          onEdit={(newValue) => handleUpdateField("username", newValue)}
          isLoading={updateProfile.isPending}
        />
        <View className="h-px bg-border" />
        <EditableInfoRow
          icon="Mail"
          label="Email"
          value={user?.email ?? "—"}
          editable={true}
          onEdit={(newValue) => handleUpdateField("email", newValue)}
          isLoading={updateProfile.isPending}
        />
        <View className="h-px bg-border" />
        <EditableInfoRow
          icon="Phone"
          label="Phone"
          value={user?.phone ?? "—"}
          editable={true}
          onEdit={(newValue) => handleUpdateField("phone", newValue)}
          isLoading={updateProfile.isPending}
        />
        <View className="h-px bg-border" />
        <EditableInfoRow
          icon="Store"
          label="Branch"
          value={branchName ?? "—"}
          editable={false}
        />
      </View>

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
        {logout.isPending ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Icon
              name="LogOut"
              size={16}
              color={THEME.light.primaryForeground}
              onPress={() => logout.mutate()}
            />
            <Text className="text-white font-semibold">Log Out</Text>
          </>
        )}
      </Button>
    </ScrollView>
  );
}
