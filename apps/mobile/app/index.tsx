import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAuthStore } from "@/store/auth";
import { View } from "react-native";

export default function HomeScreen() {
  const { user, logout } = useAuthStore();
  return (
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
  );
}
