import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { iconSize, radius, shadows, spacing, typography } from "@/theme/tokens";

const ADMIN = {
  orange: "#FF6B00",
  orangeLight: "#FFF3EA",
  text: "#0F1B35",
  muted: "#64748B",
  border: "#E5EEF7",
  white: "#FFFFFF",
  danger: "#E63946",
  dangerLight: "rgba(230, 57, 70, 0.12)",
  warning: "#8A5A00",
  warningLight: "rgba(255, 183, 3, 0.22)"
} as const;

type DashboardStatCardProps = {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: "primary" | "warning" | "danger" | "neutral";
  helper?: string;
  onPress?: () => void;
};

const toneByType = {
  primary: {
    bg: ADMIN.orangeLight,
    border: "rgba(255, 107, 0, 0.28)",
    icon: ADMIN.orange
  },
  warning: {
    bg: ADMIN.warningLight,
    border: "rgba(255, 183, 3, 0.45)",
    icon: ADMIN.warning
  },
  danger: {
    bg: ADMIN.dangerLight,
    border: "rgba(230, 57, 70, 0.35)",
    icon: ADMIN.danger
  },
  neutral: {
    bg: ADMIN.orangeLight,
    border: ADMIN.border,
    icon: ADMIN.orange
  }
} as const;

export const DashboardStatCard = ({ label, value, icon, tone = "neutral", helper, onPress }: DashboardStatCardProps) => {
  const palette = toneByType[tone];
  const content = (
    <>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: palette.bg, borderColor: palette.border }]}>
          <Ionicons name={icon} size={iconSize.md} color={palette.icon} />
        </View>
        {onPress ? <Ionicons name="chevron-back" size={14} color={ADMIN.muted} style={styles.chevron} /> : null}
      </View>
      <Text style={styles.value}>{value.toLocaleString("ar-SA")}</Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
      {helper ? (
        <Text style={styles.helper} numberOfLines={2}>
          {helper}
        </Text>
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.card}>{content}</View>;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "48.5%",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ADMIN.border,
    backgroundColor: ADMIN.white,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.soft
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }]
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between"
  },
  chevron: {
    marginTop: 2
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  value: {
    color: ADMIN.orange,
    fontSize: typography.h1,
    fontWeight: "800",
    textAlign: "right",
    writingDirection: "rtl",
    alignSelf: "stretch"
  },
  label: {
    color: ADMIN.text,
    fontSize: typography.bodySm,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "right",
    writingDirection: "rtl",
    alignSelf: "stretch"
  },
  helper: {
    color: ADMIN.muted,
    fontSize: typography.micro,
    lineHeight: 17,
    textAlign: "right",
    writingDirection: "rtl",
    alignSelf: "stretch"
  }
});
