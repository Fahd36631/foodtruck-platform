import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { buttonPalette, buttonStyles } from "./button.styles";
import type { BaseButtonProps } from "./button.types";

export const AppButton = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "start",
  style,
  testID
}: BaseButtonProps) => {
  const isDisabled = disabled || loading;
  const labelStyleByVariant =
    variant === "primary"
      ? buttonStyles.labelPrimary
      : variant === "secondary"
        ? buttonStyles.labelSecondary
        : variant === "danger"
          ? buttonStyles.labelDanger
          : buttonStyles.labelGhost;

  const iconColor = isDisabled
    ? buttonPalette.disabled.text
    : variant === "primary"
      ? buttonPalette.primary.text
      : variant === "secondary"
        ? buttonPalette.secondary.text
        : variant === "danger"
          ? buttonPalette.danger.text
          : buttonPalette.ghost.text;

  const iconNode = icon ? <Ionicons name={icon} size={18} color={iconColor} /> : null;

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      disabled={isDisabled}
      style={[buttonStyles.pressableBase, fullWidth && buttonStyles.pressableFullWidth]}
    >
      {({ pressed }) => (
        <View
          style={[
            buttonStyles.surfaceBase,
            buttonStyles[size],
            buttonStyles[variant],
            fullWidth && buttonStyles.surfaceFullWidth,
            pressed && !isDisabled && buttonStyles.pressed,
            isDisabled && buttonStyles.disabled,
            style
          ]}
        >
          {loading ? (
            <ActivityIndicator color={iconColor} />
          ) : (
            <>
              {iconPosition === "start" ? iconNode : null}
              <Text style={[buttonStyles.label, labelStyleByVariant, isDisabled && buttonStyles.labelDisabled]}>{label}</Text>
              {iconPosition === "end" ? iconNode : null}
            </>
          )}
        </View>
      )}
    </Pressable>
  );
};
