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

const summary = (order: PickupOrderItem) => {
  return order.items
    .slice(0, 2)
    .map((item) => `${item.menu_item_name} × ${item.quantity.toLocaleString("ar-SA")}`)
    .join("، ");
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
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.truckName} numberOfLines={1}>
            {order.truck_name}
          </Text>
          <Text style={styles.orderNum}>#{order.order_number}</Text>
        </View>
        <View style={[styles.statusPill, isCancelled && styles.statusDanger]}>
          <Text style={[styles.statusText, isCancelled && styles.statusDangerText]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="cash-outline" size={iconSize.sm} color={colors.textMuted} />
          <Text style={styles.metaText}>{money(order.total_amount)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="cube-outline" size={iconSize.sm} color={colors.textMuted} />
          <Text style={styles.metaText}>{order.item_count.toLocaleString("ar-SA")} عناصر</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={iconSize.sm} color={colors.textMuted} />
          <Text style={styles.metaText}>{dt(order.placed_at)}</Text>
        </View>
      </View>

      {isCurrent ? (
        <View style={styles.timelineWrap}>
          <CustomerOrderTimeline status={order.status} />
        </View>
      ) : (
        <View style={styles.historyRow}>
          {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.thumb} resizeMode="cover" /> : null}
          <View style={styles.historyTextWrap}>
            <Text style={styles.historySummary} numberOfLines={2}>
              {summary(order) || "بدون عناصر"}
            </Text>
            <Text style={styles.historySub}>
              وقت التسليم: {dt(order.picked_up_at)} {order.status === "cancelled" ? "• ملغي" : ""}
            </Text>
          </View>
        </View>
      )}

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
          <Text style={styles.detailsText}>عرض التفاصيل</Text>
          <Ionicons name="chevron-back" size={iconSize.sm} color={colors.primary} />
        </Pressable>
      </View>
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
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceElevated
  },
  topRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.xs
  },
  titleWrap: {
    flex: 1
  },
  truckName: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: "800",
    textAlign: "right"
  },
  orderNum: {
    color: colors.textMuted,
    marginTop: 2,
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "right"
  },
  statusPill: {
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4
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
  metaRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  metaItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.xs,
    paddingVertical: 6
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: "700"
  },
  timelineWrap: {
    marginTop: spacing.xs
  },
  historyRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    padding: spacing.xs
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.bgDeep
  },
  historyTextWrap: {
    flex: 1
  },
  historySummary: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "right"
  },
  historySub: {
    color: colors.textMuted,
    marginTop: 2,
    fontSize: typography.micro,
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
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4
  },
  detailsText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "800"
  }
});
