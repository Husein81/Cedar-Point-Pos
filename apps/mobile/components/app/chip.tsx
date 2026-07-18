import { Pressable } from "react-native";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/text";

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

/** Horizontal filter chip used for categories and order-status filters. */
export const Chip = ({ label, selected, onPress }: Props) => (
  <Pressable
    onPress={onPress}
    className={cn(
      "rounded-full border px-4 py-2",
      selected
        ? "bg-primary border-primary"
        : "bg-card border-border active:bg-muted",
    )}
  >
    <Text
      className={cn(
        "text-sm font-medium",
        selected ? "text-primary-foreground" : "text-muted-foreground",
      )}
    >
      {label}
    </Text>
  </Pressable>
);
