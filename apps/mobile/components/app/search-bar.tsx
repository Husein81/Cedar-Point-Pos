import { View } from "react-native";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { useAppTheme } from "@/lib/theme";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

export const SearchBar = ({ value, onChangeText, placeholder }: Props) => {
  const { mutedForeground: mutedColor } = useAppTheme();

  return (
    <View className="relative justify-center">
      <View className="absolute left-3 z-10">
        <Icon name="Search" size={16} color={mutedColor} />
      </View>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? "Search"}
        placeholderTextColor={mutedColor}
        autoCapitalize="none"
        className="h-11 rounded-xl pl-9"
      />
    </View>
  );
};
