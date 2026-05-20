import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { iconSize, radius, shadows, spacing, typography } from "@/theme/tokens";

const ADMIN = {
  orange: "#FF6B00",
  orangeLight: "#FFF3EA",
  text: "#0F1B35",
  muted: "#64748B",
  border: "#E5EEF7",
  white: "#FFFFFF"
} as const;

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
              <Ionicons name={icon} size={iconSize.md} color={disabled ? ADMIN.muted : ADMIN.orange} />
            </View>
            {badge ? (
              <View style={[styles.badge, disabled && styles.badgeMuted]}>
                <Text style={[styles.badgeText, disabled && styles.badgeTextMuted]}>{badge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.description} numberOfLines={3}>
            {description}
          </Text>
          <View style={styles.ctaRow}>
            <Text style={[styles.ctaText, disabled && styles.ctaTextMuted]}>{disabled ? "قريبًا" : "فتح القسم"}</Text>
            <Ionicons name="chevron-back" size={16} color={disabled ? ADMIN.muted : ADMIN.orange} />
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
    borderColor: ADMIN.border,
    backgroundColor: ADMIN.white,
    padding: spacing.md,
    gap: spacing.xs,
    minHeight: 148,
    ...shadows.soft
  },
  pressed: {
    transform: [{ scale: 0.995 }]
  },
  disabled: {
    opacity: 0.78
  },
  topRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between"
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 0, 0.22)",
    backgroundColor: ADMIN.orangeLight,
    alignItems: "center",
    justifyContent: "center"
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 0, 0.25)",
    backgroundColor: ADMIN.orangeLight
  },
  badgeMuted: {
    borderColor: ADMIN.border,
    backgroundColor: "#F1F5F9"
  },
  badgeText: {
    color: ADMIN.orange,
    fontSize: typography.micro,
    fontWeight: "700",
    textAlign: "right",
    writingDirection: "rtl"
  },
  badgeTextMuted: {
    color: ADMIN.muted
  },
  title: {
    color: ADMIN.text,
    fontSize: typography.body,
    fontWeight: "800",
    lineHeight: 22,
    textAlign: "right",
    writingDirection: "rtl",
    alignSelf: "stretch"
  },
  description: {
    color: ADMIN.muted,
    fontSize: typography.caption,
    lineHeight: 19,
    textAlign: "right",
    writingDirection: "rtl",
    alignSelf: "stretch"
  },
  ctaRow: {
    marginTop: "auto",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: spacing.xs
  },
  ctaText: {
    color: ADMIN.orange,
    fontSize: typography.caption,
    fontWeight: "800",
    textAlign: "right",
    writingDirection: "rtl"
  },
  ctaTextMuted: {
    color: ADMIN.muted
  }
});
