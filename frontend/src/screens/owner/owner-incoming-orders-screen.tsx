import { useCallback, useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { AppButton, AppContainer, EmptyState, LoadingSkeleton } from "@/ui";
import { getMyOwnerTrucks } from "@/features/trucks/api";
import { getIncomingOwnerOrders, updatePickupOrderStatus, type IncomingPickupOrder } from "@/features/orders/api";
import { getReadableNetworkError } from "@/api/network-error";
import { useAuthStore } from "@/store/auth-store";
import { colors, iconSize, radius, shadows, spacing, typography } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/root-stack";

const statusToArabic: Record<string, string> = {
  pending: "جديد",
  preparing: "قيد التحضير",
  ready: "جاهز للاستلام",
  picked_up: "تم الاستلام",
  cancelled: "ملغي"
};

const FILTERS: Array<{ key: "all" | IncomingPickupOrder["status"]; label: string }> = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "جديد" },
  { key: "preparing", label: "قيد التحضير" },
  { key: "ready", label: "جاهز للاستلام" },
  { key: "picked_up", label: "تم الاستلام" }
];

const statusTone = (status: string) => {
  switch (status) {
    case "pending":
      return { bg: colors.warningMuted, border: "rgba(255, 183, 3, 0.45)", fg: "#8A5A00" };
    case "preparing":
      return { bg: colors.primaryMuted, border: colors.borderStrong, fg: colors.primary };
    case "ready":
      return { bg: colors.successMuted, border: "rgba(15, 157, 90, 0.35)", fg: colors.success };
    case "picked_up":
      return { bg: colors.brandBlueSoft, border: "rgba(21, 58, 138, 0.25)", fg: colors.brandBlue };
    case "cancelled":
      return { bg: colors.dangerMuted, border: "rgba(230, 57, 70, 0.35)", fg: colors.danger };
    default:
      return { bg: colors.section, border: colors.border, fg: colors.textMuted };
  }
};

const formatPlacedAt = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return iso;
  }
};

const toArabicDigits = (value: number) => value.toLocaleString("ar-SA");

const renderRatingStars = (rating: number) =>
  `★`.repeat(Math.max(0, Math.min(5, rating))) + `☆`.repeat(Math.max(0, 5 - Math.max(0, Math.min(5, rating))));

const nextStatusActionByCurrent: Partial<
  Record<
    IncomingPickupOrder["status"],
    { nextStatus: "preparing" | "ready" | "picked_up"; cta: string; confirmLabel: string; icon: keyof typeof Ionicons.glyphMap }
  >
> = {
  pending: { nextStatus: "preparing", cta: "بدء التحضير", confirmLabel: "قيد التحضير", icon: "flame-outline" },
  preparing: { nextStatus: "ready", cta: "جاهز للاستلام", confirmLabel: "جاهز للاستلام", icon: "checkmark-circle-outline" },
  ready: { nextStatus: "picked_up", cta: "تم الاستلام", confirmLabel: "تم الاستلام", icon: "bag-check-outline" }
};

export const OwnerIncomingOrdersScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken) ?? "";
  const roleCode = useAuthStore((s) => s.user?.roleCode);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    orderId: number;
    nextStatus: "preparing" | "ready" | "picked_up";
    confirmLabel: string;
  } | null>(null);

  const incomingOrders = useQuery({
    queryKey: ["owner-incoming-orders", accessToken],
    queryFn: () => getIncomingOwnerOrders(accessToken),
    enabled: !!accessToken
  });

  const ownerTrucksQuery = useQuery({
    queryKey: ["owner-my-trucks", accessToken],
    queryFn: () => getMyOwnerTrucks(accessToken),
    enabled: !!accessToken && roleCode === "truck_owner"
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: "preparing" | "ready" | "picked_up" }) =>
      updatePickupOrderStatus(orderId, status, accessToken),
    onSuccess: async () => {
      setPendingConfirmation(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["owner-incoming-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["owner-overview-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["customer-pickup-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["customer-order-notifications"] })
      ]);
    },
    onError: (error) => {
      setPendingConfirmation(null);
      Alert.alert("تعذّر تحديث الطلب", getReadableNetworkError(error));
    }
  });

  const filteredOrders = useMemo(() => {
    const items = incomingOrders.data ?? [];
    if (filter === "all") return items;
    return items.filter((o) => o.status === filter);
  }, [incomingOrders.data, filter]);

  const onRefresh = useCallback(async () => {
    await Promise.all([incomingOrders.refetch(), ownerTrucksQuery.refetch()]);
  }, [incomingOrders, ownerTrucksQuery]);

  if (!accessToken || roleCode !== "truck_owner") {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.pad}>
          <Text style={styles.pageTitle}>طلبات الوارد</Text>
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={iconSize.lg} color={colors.primary} />
            <Text style={styles.noticeBody}>هذه الصفحة مخصصة لحساب صاحب الترك المعتمد.</Text>
          </View>
        </View>
      </AppContainer>
    );
  }

  if (incomingOrders.isLoading || ownerTrucksQuery.isLoading) {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.pad}>
          <Text style={styles.pageTitle}>طلبات الوارد</Text>
          <LoadingSkeleton rows={6} />
        </View>
      </AppContainer>
    );
  }

  if (incomingOrders.isError) {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.pad}>
          <Text style={styles.pageTitle}>طلبات الوارد</Text>
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{getReadableNetworkError(incomingOrders.error)}</Text>
            <AppButton label="إعادة المحاولة" onPress={() => void incomingOrders.refetch()} variant="primary" />
          </View>
        </View>
      </AppContainer>
    );
  }

  const ownerTrucks = ownerTrucksQuery.data ?? [];
  const hasApprovedTruck = ownerTrucks.some((truck) => truck.approval_status === "approved");

  if (!ownerTrucks.length) {
    return (
      <AppContainer edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.pageTitle}>طلبات الوارد</Text>
          <Text style={styles.pageSub}>طلبات الاستلام من الزبائن على موقع تركك.</Text>
          <EmptyState
            title="أكمل بيانات الترك أولًا"
            description="بعد تسجيل الترك واعتماده من الإدارة ستظهر الطلبات هنا."
            icon="restaurant-outline"
            actionLabel="إكمال البيانات"
            onAction={() => navigation.navigate("OwnerOnboarding", { flow: "register" })}
            variant="card"
          />
        </ScrollView>
      </AppContainer>
    );
  }

  if (!hasApprovedTruck) {
    return (
      <AppContainer edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.pageTitle}>طلبات الوارد</Text>
          <Text style={styles.pageSub}>بانتظار اعتماد الإدارة لتفعيل استقبال الطلبات.</Text>
          <View style={styles.waitCard}>
            <Ionicons name="hourglass-outline" size={iconSize.xl} color={colors.warning} />
            <Text style={styles.waitTitle}>قريبًا</Text>
            <Text style={styles.waitBody}>سيتم تفعيل استقبال الطلبات فور اعتماد تركك.</Text>
          </View>
        </ScrollView>
      </AppContainer>
    );
  }

  return (
    <AppContainer edges={["top"]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={incomingOrders.isFetching} onRefresh={() => void onRefresh()} tintColor={colors.primary} />
        }
      >
        <Text style={styles.pageTitle}>طلبات الوارد</Text>
        <Text style={styles.pageSub}>تحديث حالة الطلب للاستلام من موقع الترك فقط — بدون توصيل.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {filteredOrders.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              title="لا طلبات في هذا التصفية"
              description="عند وصول طلبات جديدة ستظهر هنا مع رقم الطلب وحالة التحضير."
              icon="receipt-outline"
              actionLabel="تحديث"
              onAction={() => void onRefresh()}
              variant="card"
            />
          </View>
        ) : (
          <View style={styles.list}>
            {filteredOrders.map((order) => {
              const updatingThis =
                updateStatusMutation.isPending && updateStatusMutation.variables?.orderId === order.id;
              const nextAction = nextStatusActionByCurrent[order.status];
              return (
                <OwnerOrderCard
                  key={order.id}
                  order={order}
                  isUpdating={updatingThis}
                  actionLabel={nextAction?.cta}
                  actionIcon={nextAction?.icon}
                  onAdvanceStatus={
                    nextAction
                      ? () =>
                          setPendingConfirmation({
                            orderId: order.id,
                            nextStatus: nextAction.nextStatus,
                            confirmLabel: nextAction.confirmLabel
                          })
                      : undefined
                  }
                />
              );
            })}
          </View>
        )}
      </ScrollView>
      {pendingConfirmation ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>تأكيد تحديث الحالة</Text>
            <Text style={styles.modalBody}>
              هل أنت متأكد من تحويل الطلب إلى {pendingConfirmation.confirmLabel}؟
            </Text>
            <View style={styles.modalActions}>
              <View style={styles.modalActionRow}>
                <View style={styles.modalActionItem}>
                  <AppButton label="إلغاء" onPress={() => setPendingConfirmation(null)} variant="secondary" fullWidth />
                </View>
                <View style={styles.modalActionItem}>
                  <AppButton
                    label="تأكيد"
                    onPress={() =>
                      updateStatusMutation.mutate({
                        orderId: pendingConfirmation.orderId,
                        status: pendingConfirmation.nextStatus
                      })
                    }
                    variant="primary"
                    fullWidth
                    disabled={updateStatusMutation.isPending}
                    loading={updateStatusMutation.isPending}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </AppContainer>
  );
};

function OwnerOrderCard({
  order,
  isUpdating,
  actionLabel,
  actionIcon,
  onAdvanceStatus
}: {
  order: IncomingPickupOrder;
  isUpdating: boolean;
  actionLabel?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onAdvanceStatus?: () => void;
}) {
  const tone = statusTone(order.status);
  const statusLabel = statusToArabic[order.status] ?? order.status;
  const customerNote =
    order.customer_note?.trim() ||
    order.items?.find((item) => item.notes?.trim())?.notes?.trim() ||
    null;
  const hasReviewData = Boolean(order.review) || (order.status === "picked_up" && Boolean(order.customer_phone?.trim()));

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <Text style={styles.orderNum}>#{order.order_number}</Text>
          <Text style={styles.truckName} numberOfLines={1}>
            {order.truck_name}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
          <Text style={[styles.statusPillText, { color: tone.fg }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaItem}>
          <Ionicons name="person-outline" size={iconSize.sm} color={colors.textMuted} />
          <Text style={styles.metaLabel}>العميل</Text>
          <Text style={styles.metaValue}>{order.customer_name?.trim() || "—"}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={iconSize.sm} color={colors.textMuted} />
          <Text style={styles.metaLabel}>وقت الطلب</Text>
          <Text style={styles.metaValue}>{formatPlacedAt(order.placed_at)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="cash-outline" size={iconSize.sm} color={colors.textMuted} />
          <Text style={styles.metaLabel}>المبلغ</Text>
          <Text style={styles.metaValue}>
            {Number(order.total_amount).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="timer-outline" size={iconSize.sm} color={colors.textMuted} />
          <Text style={styles.metaLabel}>جاهزية تقديرية</Text>
          <Text style={styles.metaValue}>
            {order.estimated_ready_minutes != null
              ? `${order.estimated_ready_minutes.toLocaleString("ar-SA")} د`
              : "—"}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {actionLabel && onAdvanceStatus ? (
          <AppButton
            label={isUpdating ? "جاري التحديث..." : actionLabel}
            onPress={onAdvanceStatus}
            variant="primary"
            icon={actionIcon}
            disabled={isUpdating}
            fullWidth
          />
        ) : null}
        {order.status === "picked_up" ? <Text style={styles.doneText}>اكتمل الطلب وتم الاستلام.</Text> : null}
        {isUpdating ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color={colors.primary} size="small" />
          </View>
        ) : null}
      </View>
      {order.items && order.items.length > 0 ? (
        <View style={styles.itemsWrap}>
          <Text style={styles.itemsTitle}>الأصناف</Text>
          {order.items.map((item) => (
            <View key={`${order.id}-${item.menu_item_id}`} style={styles.itemLine}>
              <Text style={styles.itemLineText}>
                {item.menu_item_name} × {item.quantity.toLocaleString("ar-SA")}
              </Text>
              <Text style={styles.itemLineValue}>
                {Number(item.line_total).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.infoSection}>
        <View style={styles.infoHeader}>
          <Ionicons name="create-outline" size={iconSize.sm} color={colors.primaryDark} />
          <Text style={styles.infoTitle}>ملاحظة العميل</Text>
        </View>
        <Text style={styles.infoBody}>{customerNote ?? "لا توجد ملاحظات"}</Text>
      </View>
      {hasReviewData ? (
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <Ionicons name="star-outline" size={iconSize.sm} color={colors.warning} />
            <Text style={styles.infoTitle}>تقييم العميل</Text>
          </View>
          {order.review ? (
            <>
              <Text style={styles.ratingStars}>{renderRatingStars(order.review.rating)}</Text>
              <Text style={styles.infoBody}>التقييم: {toArabicDigits(order.review.rating)} / ٥</Text>
              {order.review.comment?.trim() ? (
                <Text style={styles.infoBody}>الملاحظة: {order.review.comment.trim()}</Text>
              ) : (
                <Text style={styles.infoBodyMuted}>لا توجد ملاحظة تقييم</Text>
              )}
            </>
          ) : (
            <Text style={styles.infoBodyMuted}>لا يوجد تقييم حتى الآن</Text>
          )}
          {order.status === "picked_up" && order.customer_phone?.trim() ? (
            <Text style={styles.infoBody}>رقم الجوال: {order.customer_phone}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120
  },
  pageTitle: {
    color: colors.brandBlue,
    letterSpacing: 0.2,
    fontSize: typography.h1,
    fontWeight: "800"
  },
  pageSub: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    lineHeight: 22
  },
  chipsRow: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
    flexDirection: "row"
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  chipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.borderStrong
  },
  chipText: {
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: typography.caption
  },
  chipTextActive: {
    color: colors.primaryDark
  },
  emptyWrap: {
    marginTop: spacing.sm
  },
  list: {
    gap: spacing.sm
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.soft
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  cardTopLeft: {
    flex: 1,
    minWidth: 0
  },
  orderNum: {
    color: colors.primaryDark,
    fontWeight: "800",
    fontSize: typography.h3
  },
  truckName: {
    color: colors.textMuted,
    fontSize: typography.caption,
    marginTop: 2
  },
  statusPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  statusPillText: {
    fontWeight: "800",
    fontSize: typography.micro
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  metaItem: {
    width: "48%",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    padding: spacing.sm,
    gap: 4
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: typography.micro,
    fontWeight: "600"
  },
  metaValue: {
    color: colors.text,
    fontSize: typography.bodySm,
    fontWeight: "700"
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm
  },
  inlineLoading: {
    alignItems: "center",
    paddingVertical: spacing.xs
  },
  doneText: {
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    fontWeight: "700"
  },
  itemsWrap: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    padding: spacing.sm,
    gap: spacing.xs
  },
  itemsTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.caption
  },
  itemLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  itemLineText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.caption
  },
  itemLineValue: {
    color: colors.text,
    fontWeight: "700",
    fontSize: typography.caption
  },
  infoSection: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    padding: spacing.sm,
    gap: spacing.xs
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  infoTitle: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: "800"
  },
  infoBody: {
    color: colors.text,
    fontSize: typography.caption,
    lineHeight: 20,
    fontWeight: "600"
  },
  infoBodyMuted: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 20,
    fontWeight: "600"
  },
  ratingStars: {
    color: colors.warning,
    fontSize: typography.bodySm,
    fontWeight: "800",
    letterSpacing: 0.4
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  modalCard: {
    width: "100%",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card
  },
  modalTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: typography.h3
  },
  modalBody: {
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    lineHeight: 22
  },
  modalActions: {
    marginTop: spacing.xs,
    gap: spacing.xs
  },
  modalActionRow: {
    flexDirection: "row",
    width: "100%",
    gap: spacing.sm
  },
  modalActionItem: {
    flex: 1
  },
  noticeCard: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.soft
  },
  noticeBody: {
    flex: 1,
    color: colors.textSecondary,
    lineHeight: 22,
    fontSize: typography.bodySm
  },
  errorCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
    ...shadows.soft
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.bodySm,
    lineHeight: 22
  },
  waitCard: {
    marginTop: spacing.lg,
    alignItems: "center",
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
    ...shadows.soft
  },
  waitTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.h2
  },
  waitBody: {
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    fontSize: typography.bodySm
  }
});
