import * as Icons from "lucide-react-native";
import { LucideProps } from "lucide-react-native";
import { Pressable } from "react-native";

interface IconProps extends LucideProps {
  name: string;
  className?: string;
  onPress?: () => void;
}

export const Icon = ({ name, color, size, className, onPress }: IconProps) => {
  const iconMap = Icons as unknown as Record<string, React.ComponentType<LucideProps>>;
  const LucideIcon = iconMap[name] as React.ComponentType<LucideProps> | undefined;
  if (!LucideIcon) {
    throw new Error(
      `Icon "${name}" does not exist in lucide-react-native library.`,
    );
  }
  return (
    <Pressable className={className} onPress={onPress}>
      <LucideIcon color={color} size={size} />
    </Pressable>
  );
};
