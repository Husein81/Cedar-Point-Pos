import { AnyFieldApi } from "@tanstack/react-form";
import { useState } from "react";
import { View } from "react-native";
import { TextInputProps } from "react-native/Libraries/Components/TextInput/TextInput";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/store/theme";
import { Icon, Input, Label } from "../ui";
import { FieldInfo } from "./field-info";

type Props = {
  label: string;
  type?: string;
  field: AnyFieldApi;
  icon?: string;
  className?: string;
  placeholderColor?: string;
} & TextInputProps;

export const InputField = ({
  label,
  type = "text",
  value,
  field,
  icon,
  placeholderColor,
  className,
  ...props
}: Props) => {
  const { isDark } = useThemeStore();
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <View className="gap-2">
      <Label htmlFor={field.name}>{label}</Label>
      <View className="gap-2">
        {icon && (
          <Icon
            color={isDark ? "#71717a" : "#a1a1aa"}
            className="z-50 absolute left-3 top-[56%] -translate-y-1/2"
            name={icon}
          />
        )}
        <Input
          className={cn("h-12 rounded-xl", className)}
          value={String(field.state.value)}
          secureTextEntry={isPassword && !show}
          autoCapitalize="none"
          onChangeText={field.handleChange}
          placeholderTextColor={placeholderColor}
          {...props}
        />
        {isPassword && (
          <Icon
            name={show ? "EyeOff" : "Eye"}
            color={isDark ? "#71717a" : "#a1a1aa"}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            onPress={() => setShow(!show)}
          />
        )}
      </View>
      <FieldInfo field={field} />
    </View>
  );
};
