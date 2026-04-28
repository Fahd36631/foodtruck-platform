import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, iconSize, spacing, typography } from "@/theme/tokens";

import { AppButton } from "./app-button";

type ErrorStateProps = {
  message: string;
  onRetry: () => void;
  title?: string;
  retryLabel?: string;
};

export const ErrorState = ({
  message,
  onRetry,
  title = "تعذر الاتصال",
  retryLabel = "إعادة المحاولة"
}: ErrorStateProps) => {
  return (
    <View style={styles.center}>
      <View style={styles.iconBadge}>
        <Ionicons name="cloud-offline-outline" size={iconSize.lg} color={colors.danger} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{message}</Text>
      <AppButton label={retryLabel} onPress={onRetry} variant="primary" fullWidth />
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    gap: spacing.sm
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: "rgba(230, 57, 70, 0.25)",
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    color: colors.brandBlue,
    fontSize: typography.h2,
    fontWeight: "800"
  },
  body: {
    color: colors.textSecondary,
    textAlign: "center",
    fontSize: typography.bodySm,
    lineHeight: 22
  }
});
