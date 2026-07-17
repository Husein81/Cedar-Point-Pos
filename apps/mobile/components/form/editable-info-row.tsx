import { THEME } from "@/lib/theme";
import { useThemeStore } from "@/store/theme";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { Icon } from "../ui";
import { Text } from "../ui/text";

export function EditableInfoRow({
  icon,
  label,
  value,
  editable = false,
  onEdit,
  isLoading = false,
}: {
  icon: string;
  label: string;
  value: string;
  editable?: boolean;
  onEdit?: (newValue: string) => void;
  isLoading?: boolean;
}) {
  const { isDark } = useThemeStore();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const mutedColor = isDark
    ? THEME.dark.mutedForeground
    : THEME.light.mutedForeground;
  const themeObj = isDark ? THEME.dark : THEME.light;

  React.useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (editValue.trim() && onEdit) {
      onEdit(editValue);
    }
    setIsModalVisible(false);
  };

  return (
    <>
      <Pressable
        onPress={() => editable && setIsModalVisible(true)}
        className={editable ? "active:opacity-70" : ""}
      >
        <View className="flex-row items-center gap-3 py-3">
          <View className="h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <Icon name={icon} size={16} color={mutedColor} />
          </View>
          <View className="flex-1">
            <Text className="text-muted-foreground text-xs">{label}</Text>
            <Text className="text-sm font-medium">{value}</Text>
          </View>
          {editable && (
            <Icon
              name="Edit2"
              size={16}
              color={mutedColor}
              onPress={() => editable && setIsModalVisible(true)}
            />
          )}
        </View>
      </Pressable>

      {editable && (
        <Modal
          visible={isModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsModalVisible(false)}
          className=""
        >
          <View className="flex-1 items-center justify-center bg-black/50">
            <View
              className="bg-card rounded-2xl p-6 gap-4 w-5/6"
              style={{ borderColor: themeObj.border, borderWidth: 1 }}
            >
              <Text className="text-lg font-bold">Edit {label}</Text>
              <TextInput
                value={editValue}
                onChangeText={setEditValue}
                placeholder={`Enter ${label.toLowerCase()}`}
                className="bg-muted rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholderTextColor={mutedColor}
                editable={!isLoading}
              />
              <View className="flex-row justify-end gap-3">
                <Pressable
                  onPress={() => setIsModalVisible(false)}
                  disabled={isLoading}
                >
                  <View className="bg-muted rounded-lg py-2 px-3 items-center opacity-100">
                    <Text className="font-semibold">Cancel</Text>
                  </View>
                </Pressable>
                <Pressable onPress={handleSave} disabled={isLoading}>
                  <View className="bg-primary rounded-lg py-2 px-3 items-center">
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-primary-foreground font-semibold">
                        Save
                      </Text>
                    )}
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}
