import { StyleSheet, Text, View } from "react-native";

import { colors, radius, typography } from "@/theme/tokens";

type Operational = "open" | "busy" | "paused" | "closed" | "offline";

/**
 * Status color mapping — aligned with brand palette:
 * - open    → success green (ready / operational)
 * - busy    → highlight yellow (attention / pending-ish)
 * - paused  → highlight yellow (owner-paused, same tone as busy)
 * - closed  → neutral muted
 * - offline → danger red
 */
const config: Record<Operational, { label: string; fg: string; bg: string; border: string }> = {
  open: {
    label: "مفتوح",
    fg: colors.success,
    bg: colors.successMuted,
    border: "rgba(15, 157, 90, 0.35)"
  },
  busy: {
    label: "مزدحم",
    fg: "#8A5A00",
    bg: colors.warningMuted,
    border: "rgba(255, 183, 3, 0.45)"
  },
  paused: {
    label: "متوقف مؤقتًا",
    fg: "#8A5A00",
    bg: colors.warningMuted,
    border: "rgba(255, 183, 3, 0.45)"
  },
  closed: {
    label: "مغلق",
    fg: colors.textMuted,
    bg: "rgba(107, 120, 147, 0.12)",
    border: "rgba(107, 120, 147, 0.28)"
  },
  offline: {
    label: "غير متصل",
    fg: colors.danger,
    bg: colors.dangerMuted,
    border: "rgba(230, 57, 70, 0.35)"
  }
};

type StatusBadgeProps = {
  status: Operational | string;
  compact?: boolean;
};

export const StatusBadge = ({ status, compact }: StatusBadgeProps) => {
  const c = (config[status as Operational] ?? config.offline);
  return (
    <View style={[styles.wrap, { backgroundColor: c.bg, borderColor: c.border }, compact && styles.compact]}>
      <Text style={[styles.text, { color: c.fg }, compact && styles.textCompact]}>{c.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1
  },
  compact: {
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  text: {
    fontSize: typography.caption,
    fontWeight: "800",
    letterSpacing: 0.2
  },
  textCompact: {
    fontSize: typography.micro
  }
});
