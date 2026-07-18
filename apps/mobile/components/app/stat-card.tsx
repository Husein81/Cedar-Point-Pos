import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { useAppTheme } from "@/lib/theme";

type Props = {
  icon: string;
  label: string;
  value: string;
};

export const StatCard = ({ icon, label, value }: Props) => {
  const theme = useAppTheme();

  return (
    <View className="flex-1 bg-card border-border rounded-xl border p-4 gap-2">
      <View className="h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
        <Icon name={icon} size={16} color={theme.primary} />
      </View>
      <Text className="text-xl font-bold">{value}</Text>
      <Text className="text-muted-foreground text-xs">{label}</Text>
    </View>
  );
};
