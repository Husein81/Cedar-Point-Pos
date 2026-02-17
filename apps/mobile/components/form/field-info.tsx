import type { AnyFieldApi } from "@tanstack/react-form";
import { Text, View } from "react-native";

export function FieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <View>
      {field.state.meta.isTouched && !field.state.meta.isValid ? (
        <Text className="italic">{field.state.meta.errors.join(",")}</Text>
      ) : null}
      {field.state.meta.isValidating ? "Validating..." : null}
    </View>
  );
}
