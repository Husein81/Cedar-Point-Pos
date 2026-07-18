import type { OrderStatus } from "@repo/types";
import { View } from "react-native";
import { cn } from "@/lib/utils";
import { orderStatusStyle } from "@/lib/format";
import { Text } from "@/components/ui/text";

type Props = {
  status: OrderStatus;
  className?: string;
};

export const StatusBadge = ({ status, className }: Props) => {
  const style = orderStatusStyle(status);
  return (
    <View
      className={cn(
        "self-start rounded-full px-2.5 py-1",
        style.badge,
        className,
      )}
    >
      <Text className={cn("text-xs font-semibold", style.text)}>
        {style.label}
      </Text>
    </View>
  );
};
