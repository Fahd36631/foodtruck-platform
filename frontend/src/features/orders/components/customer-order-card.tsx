import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppButton, RatingStars } from "@/ui";
import { colors, iconSize, radius, shadows, spacing, typography } from "@/theme/tokens";
import { resolveMediaUrl } from "@/utils/media-url";

import type { PickupOrderItem } from "../api";
import { CustomerOrderTimeline } from "./customer-order-timeline";

type CustomerOrderCardProps = {
  order: PickupOrderItem;
  statusLabel: string;
  isCurrent: boolean;
  onPressDetails: () => void;
  onPressReorder?: () => void;
  ratingValue?: number;
  ratingComment?: string;
  onRatingChange?: (value: number) => void;
  onRatingCommentChange?: (value: string) => void;
  onSubmitRating?: () => void;
  isSubmittingRating?: boolean;
};

const money = (value: number) =>
  `${Number(value).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;

const dt = (value: string | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return value;
  }
};

const readyWindow = (order: PickupOrderItem) => {
  if (order.ready_at) {
    const ready = new Date(order.ready_at);
    const start = new Date(ready.getTime() - 10 * 60 * 1000);
    const fmt = (d: Date) =>
      d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
    return `${fmt(start)} - ${fmt(ready)}`;
  }
  if (order.estimated_ready_minutes && order.placed_at) {
    const start = new Date(order.placed_at);
    const end = new Date(start.getTime() + order.estimated_ready_minutes * 60 * 1000);
    const fmt = (d: Date) =>
      d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
    return `${fmt(start)} - ${fmt(end)}`;
  }
  return "—";
};

const statusDotColor = (status: PickupOrderItem["status"]) => {
  if (status === "ready" || status === "picked_up") return colors.success;
  if (status === "cancelled") return colors.danger;
  return colors.primary;
};

export const CustomerOrderCard = ({
  order,
  statusLabel,
  isCurrent,
  onPressDetails,
  onPressReorder,
  ratingValue = 0,
  ratingComment = "",
  onRatingChange,
  onRatingCommentChange,
  onSubmitRating,
  isSubmittingRating = false
}: CustomerOrderCardProps) => {
  const showRatingForm = !isCurrent && order.status === "picked_up" && !order.review;
  const isCancelled = order.status === "cancelled";
  const imageUrl = resolveMediaUrl(order.truck_cover_image_url);

  return (
    <View style={[styles.card, isCurrent && styles.cardCurrent]}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.orderNum}>#{order.order_number}</Text>
          <Text style={styles.orderTime}>{dt(order.placed_at)}</Text>
        </View>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.truckThumb} resizeMode="cover" />
        ) : (
          <View style={styles.truckThumbFallback}>
            <Ionicons name="bus-outline" size={20} color={colors.primary} />
          </View>
        )}
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusPill, isCancelled && styles.statusDanger]}>
          <View style={[styles.statusDot, { backgroundColor: statusDotColor(order.status) }]} />
          <Text style={[styles.statusText, isCancelled && styles.statusDangerText]}>{statusLabel}</Text>
        </View>
        <Text style={styles.truckName} numberOfLines={1}>
          {order.truck_name}
        </Text>
      </View>

      {!isCancelled ? (
        <View style={styles.timelineWrap}>
          <CustomerOrderTimeline status={order.status} />
        </View>
      ) : null}

      <View style={styles.infoGrid}>
        <View style={styles.infoCell}>
          <Ionicons name="time-outline" size={16} color={colors.primary} />
          <Text style={styles.infoLabel}>وقت جاهزية الطلب</Text>
          <Text style={styles.infoValue}>{readyWindow(order)}</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoCell}>
          <Ionicons name="location-outline" size={16} color={colors.textMuted} />
          <Text style={styles.infoLabel}>موقع الاستلام</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {order.truck_name}
          </Text>
          <Text style={styles.infoSub} numberOfLines={1}>
            استلام من موقع الترك
          </Text>
        </View>
      </View>

      {!isCurrent ? (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {order.item_count.toLocaleString("ar-SA")} عناصر • {money(order.total_amount)}
          </Text>
        </View>
      ) : null}

      {!isCurrent && order.review ? (
        <View style={styles.ratingResultWrap}>
          <Text style={styles.ratingTitle}>تقييمك لهذا الطلب</Text>
          <RatingStars value={order.review.rating} readonly />
          {order.review.comment ? <Text style={styles.ratingComment}>{order.review.comment}</Text> : null}
        </View>
      ) : null}

      {showRatingForm ? (
        <View style={styles.ratingFormWrap}>
          <Text style={styles.ratingTitle}>كيف كان الطلب؟</Text>
          <RatingStars value={ratingValue} onChange={onRatingChange} />
          <TextInput
            style={styles.input}
            value={ratingComment}
            onChangeText={onRatingCommentChange}
            placeholder="اكتب ملاحظة اختيارية"
            placeholderTextColor={colors.textMuted}
            multiline
            textAlign="right"
          />
          <AppButton
            label="إرسال التقييم"
            onPress={onSubmitRating ?? (() => undefined)}
            variant="primary"
            disabled={ratingValue < 1}
            loading={isSubmittingRating}
            fullWidth
          />
        </View>
      ) : null}

      <View style={styles.actions}>
        {!isCurrent && onPressReorder ? (
          <AppButton label="إعادة الطلب" onPress={onPressReorder} variant="secondary" size="sm" />
        ) : null}
        <Pressable style={styles.detailsBtn} onPress={onPressDetails} hitSlop={8}>
          <Text style={styles.detailsText}>تفاصيل الطلب</Text>
          <Ionicons name="chevron-down" size={iconSize.sm} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.soft
  },
  cardCurrent: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  headerText: {
    flex: 1,
    alignItems: "flex-end"
  },
  orderNum: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: "900"
  },
  orderTime: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600"
  },
  truckThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.bgDeep
  },
  truckThumbFallback: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  statusRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  statusPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: typography.micro,
    fontWeight: "800"
  },
  statusDanger: {
    backgroundColor: colors.dangerMuted,
    borderColor: "rgba(230, 57, 70, 0.35)"
  },
  statusDangerText: {
    color: colors.danger
  },
  truckName: {
    flex: 1,
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "left"
  },
  timelineWrap: {
    paddingVertical: spacing.xs
  },
  infoGrid: {
    flexDirection: "row-reverse",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    overflow: "hidden"
  },
  infoCell: {
    flex: 1,
    padding: spacing.sm,
    alignItems: "flex-end",
    gap: 4
  },
  infoDivider: {
    width: 1,
    backgroundColor: colors.border
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: typography.micro,
    fontWeight: "700"
  },
  infoValue: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: "800",
    textAlign: "right"
  },
  infoSub: {
    color: colors.textMuted,
    fontSize: typography.micro,
    textAlign: "right"
  },
  summaryRow: {
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  summaryText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "right"
  },
  ratingResultWrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    padding: spacing.sm,
    gap: spacing.xs,
    alignItems: "flex-end"
  },
  ratingFormWrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    gap: spacing.xs
  },
  ratingTitle: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: "800",
    textAlign: "right"
  },
  ratingComment: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    textAlign: "right"
  },
  input: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    color: colors.text,
    minHeight: 64,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    fontSize: typography.caption
  },
  actions: {
    marginTop: spacing.xs,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  detailsBtn: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 12,
    backgroundColor: colors.surface
  },
  detailsText: {
    color: colors.primary,
    fontSize: typography.bodySm,
    fontWeight: "800"
  }
});
