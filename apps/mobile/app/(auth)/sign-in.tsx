import { useForm } from "@tanstack/react-form";
import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";

import { InputField } from "@/components/form";
import { Button } from "@/components/ui";
import { Text } from "@/components/ui/text";
import { useSignIn } from "@/hooks/use-auth";
import { THEME } from "@/lib/theme";
import { useThemeStore } from "@/store/theme";

export default function SignInScreen() {
  const signIn = useSignIn();
  const { isDark } = useThemeStore();

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await signIn.mutateAsync(value);
    },
  });

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
              Sign in to take orders
            </Text>
          </View>

          <View className="gap-6 mt-12">
            <form.Field
              name="username"
              validators={{
                onChange: ({ value }) =>
                  value.trim() ? undefined : "Username is required",
              }}
            >
              {(field) => (
                <InputField
                  label="Username"
                  field={field}
                  placeholder=""
                  placeholderColor={placeholderColor}
                />
              )}
            </form.Field>

            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) =>
                  value ? undefined : "Password is required",
              }}
            >
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

            {signIn.isError ? (
              <View className="rounded-xl bg-destructive/10 border border-destructive/30 p-3">
                <Text className="text-destructive text-sm text-center">
                  {signIn.error.message}
                </Text>
              </View>
            ) : null}
          </View>

          <View>
            <form.Subscribe selector={(state) => state.canSubmit}>
              {(canSubmit) => (
                <Button
                  onPress={() => form.handleSubmit()}
                  disabled={signIn.isPending || !canSubmit}
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
              )}
            </form.Subscribe>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
