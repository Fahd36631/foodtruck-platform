import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, iconSize, radius, shadows, spacing, typography } from "@/theme/tokens";

export type OrderStatusCode = "pending" | "preparing" | "ready" | "picked_up" | "cancelled";

type OrderCardProps = {
  truckName: string;
  orderNumber: string;
  statusLabel: string;
  eta: string;
  isCurrent?: boolean;
  statusCode?: OrderStatusCode;
  onPressDetails?: () => void;
};

const progressForStatus = (code: OrderStatusCode | undefined): number => {
  switch (code) {
    case "pending":
      return 0.22;
    case "preparing":
      return 0.5;
    case "ready":
      return 0.82;
    case "picked_up":
    case "cancelled":
      return 1;
    default:
      return 0.35;
  }
};

const badgeColor = (code: OrderStatusCode | undefined) => {
  switch (code) {
    case "pending":
      return colors.primary;
    case "preparing":
      return colors.warning;
    case "ready":
      return colors.success;
    case "picked_up":
      return colors.neutral;
    case "cancelled":
      return colors.danger;
    default:
      return colors.primary;
  }
};

export const OrderCard = ({
  truckName,
  orderNumber,
  statusLabel,
  eta,
  isCurrent = false,
  statusCode,
  onPressDetails
}: OrderCardProps) => {
  const p = progressForStatus(statusCode);
  const barColor = statusCode === "cancelled" ? colors.danger : colors.primary;

  return (
    <View style={[styles.card, isCurrent && styles.cardCurrent]}>
      <View style={styles.top}>
        <View style={styles.titleBlock}>
          <Text style={styles.truck} numberOfLines={1}>
            {truckName}
          </Text>
          <Text style={styles.orderId}>#{orderNumber}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badgeColor(statusCode) }]}>
          <Text style={styles.badgeText}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(p * 100)}%`, backgroundColor: barColor }]} />
      </View>

      <View style={styles.etaRow}>
        <Ionicons name="time-outline" size={iconSize.sm} color={colors.primary} />
        <Text style={styles.eta}>{eta}</Text>
      </View>

      {onPressDetails ? (
        <Pressable style={styles.detailsBtn} onPress={onPressDetails} hitSlop={8}>
          <Text style={styles.detailsText}>تفاصيل الطلب</Text>
          <Ionicons name="chevron-back" size={iconSize.sm} color={colors.brandBlue} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.soft
  },
  cardCurrent: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated
  },
  top: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  titleBlock: {
    flex: 1,
    minWidth: 0
  },
  truck: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: "800"
  },
  orderId: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600"
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  badgeText: {
    color: colors.onPrimary,
    fontSize: typography.micro,
    fontWeight: "800"
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.bgDeep,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 3
  },
  etaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  eta: {
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    fontWeight: "600"
  },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 2
  },
  detailsText: {
    color: colors.brandBlue,
    fontWeight: "800",
    fontSize: typography.caption
  }
});
