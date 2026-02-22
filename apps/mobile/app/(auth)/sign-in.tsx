import { Button, Input, Label, Rn } from "@/components/ui";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";

import { FieldInfo } from "@/components/form/field-info";
import { useSignIn } from "@/hooks/use-auth";
import { useForm } from "@tanstack/react-form";
import { SafeAreaView } from "react-native-safe-area-context";
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
      const { username, password } = value;
      if (!username || !password) return;
      try {
        await signIn.mutateAsync({ username, password });
      } catch (error) {
        console.error(error);
      }
    },
  });

  const placeholderColor = isDark
    ? THEME.dark.mutedForeground
    : THEME.light.mutedForeground;
  const errorMessage =
    signIn.error instanceof Error ? signIn.error.message : "Sign in failed";

  React.useEffect(() => {
    if (signIn.isSuccess) {
      router.replace("/");
    }
  }, [router, signIn.isSuccess]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        className="bg-background"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerClassName="items-center flex-1 justify-center p-4">
          <Rn.Card className="w-full mx-auto">
            <Rn.CardHeader className="items-center">
              <Rn.CardTitle className="text-2xl">CedarPoint</Rn.CardTitle>
              <Rn.CardDescription>
                Enter your credentials to sign in
              </Rn.CardDescription>
            </Rn.CardHeader>
            <Rn.CardContent className="gap-4">
              <form.Field name="username">
                {(field) => (
                  <View className="gap-2">
                    <Label htmlFor={field.name} nativeID="username">
                      Username
                    </Label>
                    <Input
                      placeholder="Enter username"
                      placeholderTextColor={placeholderColor}
                      value={field.state.value}
                      onChangeText={field.handleChange}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <FieldInfo field={field} />
                  </View>
                )}
              </form.Field>
              <form.Field name="password">
                {(field) => (
                  <View className="gap-2">
                    <Label htmlFor={field.name} nativeID="password">
                      Password
                    </Label>
                    <Input
                      placeholder="Enter password"
                      placeholderTextColor={placeholderColor}
                      value={field.state.value}
                      onChangeText={field.handleChange}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <FieldInfo field={field} />
                  </View>
                )}
              </form.Field>
              {signIn.isError ? (
                <Text className="text-sm text-destructive">{errorMessage}</Text>
              ) : null}
            </Rn.CardContent>
            <Rn.CardFooter>
              <Button
                className="w-full"
                onPress={() => form.handleSubmit()}
                disabled={signIn.isPending}
              >
                <Text className="text-white">
                  {signIn.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    "Sign In"
                  )}
                </Text>
              </Button>
            </Rn.CardFooter>
          </Rn.Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
