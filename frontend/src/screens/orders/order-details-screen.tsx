import { useMemo } from "react";
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { AppContainer, EmptyState, RatingStars } from "@/ui";
import { CustomerOrderTimeline } from "@/features/orders/components/customer-order-timeline";
import { getMyPickupOrders, type PickupOrderItem } from "@/features/orders/api";
import { useTruckDetails } from "@/features/trucks/hooks/use-truck-details";
import type { RootStackParamList } from "@/navigation/root-stack";
import { useAuthStore } from "@/store/auth-store";
import { resolveMediaUrl } from "@/utils/media-url";
import { colors, radius, spacing, typography } from "@/theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "OrderDetails">;

const ORD = {
  orange: "#FF6B00",
  text: "#0F1B35",
  muted: "#64748B",
  border: "#E5EEF7",
  bg: "#F7FAFD",
  white: "#FFFFFF",
  shadow: "rgba(15, 27, 53, 0.08)"
} as const;

const statusLabel: Record<string, string> = {
  pending: "تم استلام الطلب",
  preparing: "قيد التحضير",
  ready: "جاهز للاستلام",
  picked_up: "تم التسليم",
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

const orderTimeLabel = (value: string | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("ar-SA", { weekday: "long", hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
};

const readyWindow = (order: PickupOrderItem) => {
  if (order.ready_at) {
    const ready = new Date(order.ready_at);
    const start = new Date(ready.getTime() - 10 * 60 * 1000);
    const fmt = (d: Date) => d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
    return `${fmt(start)} - ${fmt(ready)}`;
  }
  if (order.estimated_ready_minutes && order.placed_at) {
    const start = new Date(order.placed_at);
    const end = new Date(start.getTime() + order.estimated_ready_minutes * 60 * 1000);
    const fmt = (d: Date) => d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
    return `${fmt(start)} - ${fmt(end)}`;
  }
  return "—";
};

const money = (value: number) =>
  `${Number(value).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;

const pickupAddressLine = (neighborhood: string | null | undefined, city: string | null | undefined) => {
  const parts = [neighborhood, city].filter(Boolean);
  return parts.length > 0 ? parts.join("، ") : "استلام من موقع الترك";
};

const openGoogleMaps = async (latitude: number | string | null | undefined, longitude: number | string | null | undefined) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    Alert.alert("تنبيه", "موقع الترك غير متوفر حالياً.");
    return;
  }

  const url = `https://maps.google.com/?q=${lat},${lng}`;
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // fallback below
  }

  Alert.alert("تنبيه", "تعذر فتح خرائط Google على هذا الجهاز.");
};

function useOrder(orderId: number, accessToken: string) {
  const ordersQuery = useQuery({
    queryKey: ["customer-pickup-orders", accessToken],
    queryFn: () => getMyPickupOrders(accessToken),
    enabled: !!accessToken
  });

  const order = useMemo(
    () => (ordersQuery.data ?? []).find((item) => item.id === orderId),
    [ordersQuery.data, orderId]
  );

  const notes = useMemo(
    () => order?.items.map((item) => item.notes?.trim()).filter((note): note is string => Boolean(note)).join("، ") ?? "",
    [order]
  );

  const subtotal = useMemo(
    () => (order?.items ?? []).reduce((sum, item) => sum + Number(item.line_total), 0),
    [order]
  );

  const serviceFee = useMemo(() => {
    if (!order) return 0;
    return Number(Math.max(0, Number(order.total_amount) - subtotal).toFixed(2));
  }, [order, subtotal]);

  return { order, notes, subtotal, serviceFee };
}

export const OrderDetailsScreen = ({ route, navigation }: Props) => {
  const { orderId } = route.params;
  const accessToken = useAuthStore((s) => s.accessToken) ?? "";
  const { order, notes, subtotal, serviceFee } = useOrder(orderId, accessToken);
  const truckQuery = useTruckDetails(order?.truck_id ?? 0, accessToken);

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

  const imageUrl = resolveMediaUrl(order.truck_cover_image_url);
  const label = statusLabel[order.status] ?? order.status;
  const truckLocation = truckQuery.data;
  const pickupAddress = pickupAddressLine(truckLocation?.neighborhood, truckLocation?.city);

  const handleOpenMaps = () => {
    void openGoogleMaps(truckLocation?.latitude, truckLocation?.longitude);
  };

  return (
    <AppContainer edges={["top"]}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={ORD.orange} />
          </Pressable>
          <Text style={styles.pageTitle}>تفاصيل الطلب</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.card}>
          <View style={styles.headerCardRow}>
            <View style={styles.headerText}>
              <Text style={styles.orderNum}>#{order.order_number}</Text>
              <Text style={styles.orderTime}>{orderTimeLabel(order.placed_at)}</Text>
              <View style={styles.statusPill}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        order.status === "ready" || order.status === "picked_up"
                          ? colors.success
                          : order.status === "cancelled"
                            ? colors.danger
                            : colors.primary
                    }
                  ]}
                />
                <Text style={styles.statusText}>{label}</Text>
              </View>
            </View>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.truckThumb} resizeMode="cover" />
            ) : (
              <View style={styles.truckThumbFallback}>
                <Ionicons name="bus-outline" size={22} color={ORD.orange} />
              </View>
            )}
          </View>

          {order.status !== "cancelled" ? <CustomerOrderTimeline status={order.status} /> : null}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHead}>
            <Ionicons name="location-outline" size={18} color={ORD.orange} />
            <Text style={styles.sectionTitle}>موقع الاستلام</Text>
          </View>

          <View style={styles.pickupRow}>
            <Pressable style={styles.mapPlaceholder} onPress={handleOpenMaps}>
              <Ionicons name="map-outline" size={28} color={ORD.muted} />
              <View style={styles.mapPin}>
                <Ionicons name="location" size={14} color={ORD.white} />
              </View>
            </Pressable>
            <Pressable style={styles.pickupBody} onPress={handleOpenMaps}>
              <Text style={styles.pickupName}>{order.truck_name}</Text>
              <Text style={styles.pickupAddress}>{pickupAddress}</Text>
              <View style={styles.mapBtn}>
                <Ionicons name="navigate-outline" size={14} color={ORD.text} />
                <Text style={styles.mapBtnText}>عرض على الخريطة</Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.readyRow}>
            <View style={styles.readyText}>
              <Text style={styles.readyLabel}>وقت جاهزية الطلب</Text>
              <Text style={styles.readyValue}>{readyWindow(order)}</Text>
            </View>
            <Ionicons name="time-outline" size={18} color={ORD.orange} />
            <Text style={styles.readyHint}>يرجى الحضور خلال الوقت المحدد</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHead}>
            <Ionicons name="bag-outline" size={18} color={ORD.orange} />
            <Text style={styles.sectionTitle}>الطلب</Text>
          </View>

          {order.items.map((item) => (
            <View key={`${order.id}-${item.menu_item_id}`} style={styles.itemRow}>
              <View style={styles.itemMeta}>
                <Text style={styles.itemPrice}>{money(item.line_total)}</Text>
                <Text style={styles.itemName}>{item.menu_item_name}</Text>
                <Text style={styles.itemDesc}>
                  الكمية: {item.quantity.toLocaleString("ar-SA")}
                  {item.notes?.trim() ? ` • ${item.notes.trim()}` : ""}
                </Text>
              </View>
              <View style={styles.qtyBadge}>
                <Text style={styles.qtyText}>{item.quantity.toLocaleString("ar-SA")}</Text>
              </View>
              <View style={styles.itemThumb}>
                <Ionicons name="fast-food-outline" size={20} color={ORD.orange} />
              </View>
            </View>
          ))}

          <View style={styles.totalsDivider} />
          <SummaryRow label="المجموع الفرعي" value={money(subtotal)} />
          <SummaryRow label="رسوم الخدمة" value={money(serviceFee)} info />
          <View style={styles.totalsDivider} />
          <SummaryRow label="الإجمالي" value={money(order.total_amount)} strong />
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHead}>
            <Ionicons name="information-circle-outline" size={18} color={ORD.muted} />
            <Text style={styles.sectionTitle}>معلومات إضافية</Text>
          </View>
          <Text style={styles.bullet}>• جميع الطلبات للاستلام فقط من موقع الترك.</Text>
          {notes ? <Text style={styles.bullet}>• ملاحظات الطلب: {notes}</Text> : null}
          <Text style={styles.bullet}>• وقت الطلب: {dt(order.placed_at)}</Text>
          {order.picked_up_at ? <Text style={styles.bullet}>• وقت التسليم: {dt(order.picked_up_at)}</Text> : null}
        </View>

        {order.review ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>تقييمك</Text>
            <RatingStars value={order.review.rating} readonly />
            {order.review.comment ? <Text style={styles.reviewComment}>{order.review.comment}</Text> : null}
          </View>
        ) : null}

        <Pressable style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>رجوع إلى الطلبات</Text>
        </Pressable>
      </ScrollView>
    </AppContainer>
  );
};

const SummaryRow = ({
  label,
  value,
  strong = false,
  info = false
}: {
  label: string;
  value: string;
  strong?: boolean;
  info?: boolean;
}) => (
  <View style={summaryStyles.row}>
    <Text style={[summaryStyles.value, strong && summaryStyles.valueStrong]}>{value}</Text>
    <View style={summaryStyles.labelWrap}>
      {info ? <Ionicons name="information-circle-outline" size={14} color={ORD.muted} /> : null}
      <Text style={[summaryStyles.label, strong && summaryStyles.labelStrong]}>{label}</Text>
    </View>
  </View>
);

const summaryStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6
  },
  labelWrap: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4
  },
  label: {
    color: ORD.muted,
    fontSize: typography.bodySm,
    fontWeight: "600"
  },
  labelStrong: {
    color: ORD.text,
    fontWeight: "800",
    fontSize: typography.body
  },
  value: {
    color: ORD.text,
    fontSize: typography.bodySm,
    fontWeight: "700"
  },
  valueStrong: {
    color: ORD.orange,
    fontSize: typography.h2,
    fontWeight: "900"
  }
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: ORD.bg
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120,
    gap: spacing.md
  },
  notFound: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  pageTitle: {
    flex: 1,
    color: ORD.text,
    fontSize: typography.h2,
    fontWeight: "900",
    textAlign: "center"
  },
  topBarSpacer: {
    width: 40
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ORD.border,
    backgroundColor: ORD.white,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: ORD.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3
  },
  headerCardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  headerText: {
    flex: 1,
    alignItems: "flex-end"
  },
  orderNum: {
    color: ORD.text,
    fontSize: typography.h2,
    fontWeight: "900"
  },
  orderTime: {
    marginTop: 4,
    color: ORD.muted,
    fontSize: typography.caption,
    fontWeight: "600"
  },
  statusPill: {
    marginTop: 8,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  statusText: {
    color: ORD.text,
    fontSize: typography.caption,
    fontWeight: "800"
  },
  truckThumb: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: colors.bgDeep
  },
  truckThumbFallback: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  sectionHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8
  },
  sectionTitle: {
    color: ORD.text,
    fontSize: typography.body,
    fontWeight: "800",
    textAlign: "right"
  },
  pickupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  mapPlaceholder: {
    width: 96,
    height: 72,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: ORD.border,
    alignItems: "center",
    justifyContent: "center"
  },
  mapPin: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ORD.orange,
    alignItems: "center",
    justifyContent: "center"
  },
  pickupBody: {
    flex: 1,
    alignItems: "flex-end",
    gap: 4
  },
  pickupName: {
    color: ORD.text,
    fontSize: typography.bodySm,
    fontWeight: "800",
    textAlign: "right"
  },
  pickupAddress: {
    color: ORD.muted,
    fontSize: typography.caption,
    textAlign: "right"
  },
  mapBtn: {
    marginTop: 4,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ORD.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface2
  },
  mapBtnText: {
    color: ORD.text,
    fontSize: typography.caption,
    fontWeight: "700"
  },
  readyRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    padding: spacing.sm
  },
  readyText: {
    flex: 1,
    alignItems: "flex-end"
  },
  readyLabel: {
    color: ORD.muted,
    fontSize: typography.caption,
    fontWeight: "600"
  },
  readyValue: {
    color: ORD.text,
    fontSize: typography.bodySm,
    fontWeight: "800"
  },
  readyHint: {
    width: "100%",
    color: ORD.muted,
    fontSize: typography.micro,
    textAlign: "right"
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs
  },
  itemMeta: {
    flex: 1,
    alignItems: "flex-end"
  },
  itemPrice: {
    color: ORD.orange,
    fontWeight: "800",
    fontSize: typography.bodySm
  },
  itemName: {
    color: ORD.text,
    fontWeight: "800",
    fontSize: typography.bodySm,
    textAlign: "right"
  },
  itemDesc: {
    marginTop: 2,
    color: ORD.muted,
    fontSize: typography.caption,
    textAlign: "right"
  },
  qtyBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6
  },
  qtyText: {
    color: ORD.text,
    fontWeight: "800",
    fontSize: typography.caption
  },
  itemThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  totalsDivider: {
    height: 1,
    backgroundColor: ORD.border,
    marginVertical: spacing.xs
  },
  bullet: {
    color: ORD.muted,
    fontSize: typography.caption,
    lineHeight: 22,
    textAlign: "right"
  },
  reviewComment: {
    color: ORD.muted,
    fontSize: typography.caption,
    textAlign: "right"
  },
  primaryBtn: {
    borderRadius: 16,
    backgroundColor: ORD.orange,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs
  },
  primaryBtnText: {
    color: ORD.white,
    fontSize: typography.body,
    fontWeight: "800"
  }
});
