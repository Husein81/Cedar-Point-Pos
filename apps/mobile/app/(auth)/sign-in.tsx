import { useForm } from "@tanstack/react-form";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";

import { InputField } from "@/components/form";
import { Button } from "@/components/ui";
import { useSignIn } from "@/hooks/use-auth";
import { THEME } from "@/lib/theme";
import { useThemeStore } from "@/store/theme";

export default function SignInScreen() {
  const router = useRouter();
  const signIn = useSignIn();
  const { isDark } = useThemeStore();

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      if (!value.username || !value.password) return;
      await signIn.mutateAsync(value);
    },
  });

  useEffect(() => {
    if (signIn.isSuccess) {
      router.replace("/");
    }
  }, [signIn.isSuccess, router]);

  const placeholderColor = isDark
    ? THEME.dark.mutedForeground
    : THEME.light.mutedForeground;

  return (
    <View className="flex-1 bg-background">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            justifyContent: "space-between",
            paddingHorizontal: 24,
            paddingTop: 100,
            paddingBottom: 40,
            gap: 32,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center gap-3">
            <Text className="text-5xl font-bold tracking-tight text-primary">
              Cedar Point
            </Text>
            <Text className="text-muted-foreground text-base text-center">
              Sign in to continue
            </Text>
          </View>

          <View className="gap-6 mt-12">
            <form.Field name="username">
              {(field) => (
                <InputField
                  label="Username"
                  field={field}
                  placeholder="Enter username"
                  placeholderColor={placeholderColor}
                />
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <InputField
                  label="Password"
                  field={field}
                  type="password"
                  placeholder="Enter password"
                  placeholderColor={placeholderColor}
                />
              )}
            </form.Field>
          </View>

          <View>
            <Button
              onPress={() => form.handleSubmit()}
              disabled={signIn.isPending}
              className="h-14 rounded-xl w-full"
            >
              {signIn.isPending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Sign In
                </Text>
              )}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
