import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, iconSize, radius, shadows, spacing, typography } from "@/theme/tokens";

type QuickActionCardProps = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
  onPress: () => void;
  disabled?: boolean;
};

export const QuickActionCard = ({
  title,
  description,
  icon,
  badge,
  onPress,
  disabled = false
}: QuickActionCardProps) => {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={styles.pressable}>
      {({ pressed }) => (
        <View style={[styles.card, pressed && !disabled && styles.pressed, disabled && styles.disabled]}>
          <View style={styles.topRow}>
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={iconSize.md} color={colors.brandBlue} />
            </View>
            {badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          <View style={styles.ctaRow}>
            <Text style={styles.ctaText}>{disabled ? "قريبًا" : "فتح القسم"}</Text>
            <Ionicons name="arrow-back-outline" size={16} color={colors.primary} />
          </View>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    width: "48.5%"
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.xs,
    minHeight: 142,
    ...shadows.soft
  },
  pressed: {
    transform: [{ scale: 0.995 }]
  },
  disabled: {
    opacity: 0.72
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(21, 58, 138, 0.25)",
    backgroundColor: colors.brandBlueSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.section
  },
  badgeText: {
    color: colors.textMuted,
    fontSize: typography.micro,
    fontWeight: "700"
  },
  title: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
    textAlign: "right",
    writingDirection: "rtl"
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 18,
    textAlign: "right",
    writingDirection: "rtl"
  },
  ctaRow: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.xs
  },
  ctaText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "800"
  }
});
