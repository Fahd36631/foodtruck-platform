import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMemo } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { AppButton, AppContainer, EmptyState, RatingStars } from "@/ui";
import { CustomerOrderTimeline } from "@/features/orders/components/customer-order-timeline";
import { getMyPickupOrders } from "@/features/orders/api";
import type { RootStackParamList } from "@/navigation/root-stack";
import { useAuthStore } from "@/store/auth-store";
import { colors, iconSize, radius, shadows, spacing, typography } from "@/theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "OrderDetails">;

const statusLabel: Record<string, string> = {
  pending: "جديد",
  preparing: "قيد التحضير",
  ready: "جاهز للاستلام",
  picked_up: "تم الاستلام",
  cancelled: "ملغي"
};

const dt = (value: string | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
};

export const OrderDetailsScreen = ({ route, navigation }: Props) => {
  const { orderId } = route.params;
  const accessToken = useAuthStore((s) => s.accessToken) ?? "";
  const ordersQuery = useQuery({
    queryKey: ["customer-pickup-orders", accessToken],
    queryFn: () => getMyPickupOrders(accessToken),
    enabled: !!accessToken
  });

  const order = useMemo(() => (ordersQuery.data ?? []).find((item) => item.id === orderId), [ordersQuery.data, orderId]);
  const notes = useMemo(
    () => order?.items.map((item) => item.notes?.trim()).filter((note): note is string => Boolean(note)).join("، ") ?? "",
    [order]
  );

  if (!order) {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.notFound}>
          <EmptyState
            title="تعذر العثور على الطلب"
            description="قد يكون الطلب غير متاح حاليًا. ارجع لشاشة الطلبات وحاول التحديث."
            icon="alert-circle-outline"
            actionLabel="رجوع"
            onAction={() => navigation.goBack()}
            variant="card"
          />
        </View>
      </AppContainer>
    );
  }

  return (
    <AppContainer edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>تفاصيل الطلب</Text>
        <Text style={styles.pageSub}>#{order.order_number}</Text>

        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.truckName}>{order.truck_name}</Text>
              <Text style={styles.status}>{statusLabel[order.status] ?? order.status}</Text>
            </View>
            <Ionicons name="receipt-outline" size={iconSize.lg} color={colors.primaryDark} />
          </View>

          <CustomerOrderTimeline status={order.status} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>العناصر</Text>
          {order.items.map((item) => (
            <View key={`${order.id}-${item.menu_item_id}`} style={styles.itemRow}>
              <Text style={styles.itemName}>
                {item.menu_item_name} × {item.quantity.toLocaleString("ar-SA")}
              </Text>
              <Text style={styles.itemPrice}>
                {Number(item.line_total).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
              </Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>الإجمالي</Text>
            <Text style={styles.totalValue}>
              {Number(order.total_amount).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>معلومات الوقت</Text>
          <Text style={styles.infoLine}>وقت الطلب: {dt(order.placed_at)}</Text>
          <Text style={styles.infoLine}>وقت الجاهزية: {dt(order.ready_at)}</Text>
          <Text style={styles.infoLine}>وقت التسليم: {dt(order.picked_up_at)}</Text>
          <Text style={styles.infoLine}>ملاحظات الطلب: {notes || "لا توجد ملاحظات"}</Text>
        </View>

        {order.review ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>تقييمك</Text>
            <RatingStars value={order.review.rating} readonly />
            {order.review.comment ? <Text style={styles.reviewComment}>{order.review.comment}</Text> : null}
          </View>
        ) : null}

        <AppButton label="رجوع للطلبات" onPress={() => navigation.goBack()} variant="secondary" fullWidth />
      </ScrollView>
    </AppContainer>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120,
    gap: spacing.sm
  },
  notFound: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl
  },
  pageTitle: {
    color: colors.brandBlue,
    letterSpacing: 0.2,
    fontSize: typography.h1,
    fontWeight: "800",
    textAlign: "right"
  },
  pageSub: {
    color: colors.textMuted,
    fontSize: typography.bodySm,
    marginBottom: spacing.xs,
    textAlign: "right"
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.soft
  },
  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center"
  },
  headerText: {
    flex: 1
  },
  truckName: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: "800",
    textAlign: "right"
  },
  status: {
    color: colors.primaryDark,
    fontSize: typography.caption,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "right"
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.bodySm,
    fontWeight: "800",
    textAlign: "right"
  },
  itemRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  itemName: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.caption,
    textAlign: "right"
  },
  itemPrice: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: "700"
  },
  totalRow: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row-reverse",
    justifyContent: "space-between"
  },
  totalLabel: {
    color: colors.text,
    fontSize: typography.bodySm,
    fontWeight: "700"
  },
  totalValue: {
    color: colors.primaryDark,
    fontSize: typography.bodySm,
    fontWeight: "900"
  },
  infoLine: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    textAlign: "right",
    lineHeight: 20
  },
  reviewComment: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    textAlign: "right"
  }
});
