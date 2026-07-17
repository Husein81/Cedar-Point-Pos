import * as Icons from "lucide-react-native";
import { LucideProps } from "lucide-react-native";
import { Pressable } from "react-native";

interface IconProps extends LucideProps {
  /** Lucide icon name, e.g. "ChevronDown". Ignored when `as` is provided. */
  name?: string;
  /** Direct icon component, used by the reusables-style primitives. */
  as?: React.ComponentType<LucideProps>;
  className?: string;
  onPress?: () => void;
  color?: string;
  stroke?: string;
  fill?: string;
}

export const Icon = ({
  name,
  as,
  size,
  className,
  onPress,
  color,
  ...props
}: IconProps) => {
  const iconMap = Icons as unknown as Record<
    string,
    React.ComponentType<LucideProps>
  >;
  const LucideIcon = as ?? (name ? iconMap[name] : undefined);
  if (!LucideIcon) {
    throw new Error(
      `Icon "${name}" does not exist in lucide-react-native library.`,
    );
  }
  return (
    <Pressable className={className} onPress={onPress}>
      <LucideIcon size={size} stroke={color} {...props} />
    </Pressable>
  );
};
