import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";

export default function HomeScreen() {
  const { user, logout } = useAuthStore();
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <View className="flex-1 bg-background items-center justify-center p-4 gap-4">
        <Text className="text-2xl font-bold text-primary">
          Welcome, {user?.name}!
        </Text>
        <Text className="text-muted-foreground">
          You are logged in as {user?.role}
        </Text>

        <Button variant="outline" onPress={() => logout()} className="mt-4">
          <Text>Logout</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
