import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, iconSize, radius, shadows, spacing, typography } from "@/theme/tokens";

import { AppButton } from "./app-button";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Card: white panel with shadow — use on large empty areas (e.g. orders). */
  variant?: "plain" | "card";
};

export const EmptyState = ({
  title,
  description,
  icon = "compass-outline",
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  variant = "plain"
}: EmptyStateProps) => {
  const inner = (
    <>
      <View style={styles.iconRing}>
        <Ionicons name={icon} size={iconSize.lg} color={colors.brandBlue} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{description}</Text>
      {actionLabel && onAction ? (
        <View style={styles.actions}>
          <AppButton label={actionLabel} onPress={onAction} variant="primary" fullWidth />
          {secondaryLabel && onSecondary ? (
            <AppButton label={secondaryLabel} onPress={onSecondary} variant="ghost" fullWidth />
          ) : null}
        </View>
      ) : null}
    </>
  );

  if (variant === "card") {
    return <View style={styles.cardWrap}>{inner}</View>;
  }

  return <View style={styles.wrap}>{inner}</View>;
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm
  },
  cardWrap: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(21, 58, 138, 0.25)",
    backgroundColor: colors.brandBlueSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    color: colors.brandBlue,
    fontSize: typography.h2,
    fontWeight: "800",
    textAlign: "center"
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    lineHeight: 22,
    textAlign: "center"
  },
  actions: {
    marginTop: spacing.sm,
    width: "100%",
    gap: spacing.sm
  }
});
