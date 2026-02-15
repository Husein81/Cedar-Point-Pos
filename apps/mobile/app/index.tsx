import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView edges={["top"]}>
      <View>
        <Text>Home</Text>
      </View>
    </SafeAreaView>
  );
}
