import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppButton, AppContainer, EmptyState, LoadingSkeleton } from "@/ui";
import { CustomerOrderCard } from "@/features/orders/components/customer-order-card";
import { getMyPickupOrders, submitOrderReview } from "@/features/orders/api";
import type { MainTabParamList } from "@/navigation/main-tabs";
import type { RootStackParamList } from "@/navigation/root-stack";
import { getReadableNetworkError } from "@/api/network-error";
import { useAuthStore } from "@/store/auth-store";
import { colors, iconSize, radius, shadows, spacing, typography } from "@/theme/tokens";

const statusLabel: Record<string, string> = {
  pending: "جديد",
  preparing: "قيد التحضير",
  ready: "جاهز للاستلام",
  picked_up: "تم الاستلام",
  cancelled: "ملغي"
};

type OrdersNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Orders">,
  NativeStackNavigationProp<RootStackParamList>
>;

const activeStatuses: ReadonlyArray<string> = ["pending", "preparing", "ready"];

type TabKey = "current" | "history";

export const OrdersScreen = () => {
  const navigation = useNavigation<OrdersNav>();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken) ?? "";
  const [selectedTab, setSelectedTab] = useState<TabKey>("current");
  const [draftRatings, setDraftRatings] = useState<Record<number, { stars: number; comment: string }>>({});

  const ordersQuery = useQuery({
    queryKey: ["customer-pickup-orders", accessToken],
    queryFn: () => getMyPickupOrders(accessToken),
    enabled: !!accessToken
  });

  const submitReviewMutation = useMutation({
    mutationFn: ({ orderId, rating, comment }: { orderId: number; rating: number; comment?: string }) =>
      submitOrderReview(orderId, { rating, comment }, accessToken),
    onSuccess: async (_, variables) => {
      setDraftRatings((prev) => {
        const next = { ...prev };
        delete next[variables.orderId];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ["customer-pickup-orders"] });
    }
  });

  const { currentOrders, pastOrders } = useMemo(() => {
    const all = ordersQuery.data ?? [];
    return {
      currentOrders: all.filter((order) => activeStatuses.includes(order.status)),
      pastOrders: all.filter((order) => !activeStatuses.includes(order.status))
    };
  }, [ordersQuery.data]);

  const onRefresh = useCallback(async () => {
    await ordersQuery.refetch();
  }, [ordersQuery]);

  // ------------------------------------------------------------
  // Guards
  // ------------------------------------------------------------

  if (!accessToken) {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.guestWrap}>
          <PageHeader title="الطلبات" subtitle="تابع كل طلباتك من مكان واحد" />
          <View style={styles.guestCard}>
            <View style={styles.guestIconWrap}>
              <Ionicons name="receipt-outline" size={iconSize.xl} color={colors.primary} />
            </View>
            <Text style={styles.guestTitle}>سجّل دخولك لعرض طلباتك</Text>
            <Text style={styles.guestBody}>
              تابع حالة التحضير والاستلام للطلب النشط، وراجع سجل طلباتك السابقة من مكان واحد.
            </Text>
            <AppButton label="تسجيل الدخول" onPress={() => navigation.navigate("Auth")} variant="primary" fullWidth size="lg" />
          </View>
        </View>
      </AppContainer>
    );
  }

  if (ordersQuery.isLoading) {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.pad}>
          <PageHeader title="الطلبات" subtitle="جارِ تحميل طلباتك..." />
          <LoadingSkeleton rows={5} />
        </View>
      </AppContainer>
    );
  }

  if (ordersQuery.isError) {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.pad}>
          <PageHeader title="الطلبات" />
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={iconSize.xl} color={colors.danger} />
            <Text style={styles.errorText}>{getReadableNetworkError(ordersQuery.error)}</Text>
            <AppButton label="إعادة المحاولة" onPress={() => void ordersQuery.refetch()} variant="primary" fullWidth />
          </View>
        </View>
      </AppContainer>
    );
  }

  // ------------------------------------------------------------
  // Main
  // ------------------------------------------------------------

  const orders = selectedTab === "current" ? currentOrders : pastOrders;
  const isEmpty = orders.length === 0;

  return (
    <AppContainer edges={["top"]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={ordersQuery.isFetching}
            onRefresh={() => void onRefresh()}
            tintColor={colors.primary}
          />
        }
      >
        <PageHeader title="الطلبات" subtitle="تابع طلباتك الحالية والسابقة بواجهة منظمة" />

        <OrdersTabs
          selected={selectedTab}
          onChange={setSelectedTab}
          currentCount={currentOrders.length}
          pastCount={pastOrders.length}
        />

        {selectedTab === "current" ? (
          isEmpty ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                title="لا يوجد لديك طلب حالي"
                description="عندما تنشئ طلبًا جديدًا ستظهر حالة التحضير والاستلام هنا مباشرة."
                icon="receipt-outline"
                actionLabel="استكشاف التركات"
                onAction={() => navigation.navigate("Home")}
                secondaryLabel="الخريطة"
                onSecondary={() => navigation.navigate("Map")}
                variant="card"
              />
            </View>
          ) : (
            <View style={styles.stack}>
              {currentOrders.map((order) => (
                <CustomerOrderCard
                  key={order.id}
                  order={order}
                  isCurrent
                  statusLabel={statusLabel[order.status] ?? order.status}
                  onPressDetails={() => navigation.navigate("OrderDetails", { orderId: order.id })}
                />
              ))}
            </View>
          )
        ) : isEmpty ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              title="لا توجد طلبات سابقة بعد"
              description="بعد اكتمال أول طلب لديك، ستظهر هنا بطاقات الطلبات السابقة والتقييم."
              icon="time-outline"
              actionLabel="ابدأ طلب جديد"
              onAction={() => navigation.navigate("Home")}
              variant="card"
            />
          </View>
        ) : (
          <View style={styles.stack}>
            {pastOrders.map((order) => {
              const draft = draftRatings[order.id] ?? { stars: 0, comment: "" };
              return (
                <CustomerOrderCard
                  key={order.id}
                  order={order}
                  isCurrent={false}
                  statusLabel={statusLabel[order.status] ?? order.status}
                  onPressDetails={() => navigation.navigate("OrderDetails", { orderId: order.id })}
                  onPressReorder={() =>
                    navigation.navigate("TruckDetails", {
                      truckId: Number(order.truck_id),
                      truckName: order.truck_name
                    })
                  }
                  ratingValue={draft.stars}
                  ratingComment={draft.comment}
                  onRatingChange={(value) =>
                    setDraftRatings((prev) => ({
                      ...prev,
                      [order.id]: { stars: value, comment: prev[order.id]?.comment ?? "" }
                    }))
                  }
                  onRatingCommentChange={(value) =>
                    setDraftRatings((prev) => ({
                      ...prev,
                      [order.id]: { stars: prev[order.id]?.stars ?? 0, comment: value }
                    }))
                  }
                  onSubmitRating={() =>
                    submitReviewMutation.mutate({
                      orderId: order.id,
                      rating: draft.stars,
                      comment: draft.comment?.trim() || undefined
                    })
                  }
                  isSubmittingRating={
                    submitReviewMutation.isPending && submitReviewMutation.variables?.orderId === order.id
                  }
                />
              );
            })}
            {submitReviewMutation.isError ? (
              <Text style={styles.ratingError}>{getReadableNetworkError(submitReviewMutation.error)}</Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </AppContainer>
  );
};

// ============================================================
// Orders Tabs (segmented control)
// ============================================================

const OrdersTabs = ({
  selected,
  onChange,
  currentCount,
  pastCount
}: {
  selected: TabKey;
  onChange: (value: TabKey) => void;
  currentCount: number;
  pastCount: number;
}) => (
  <View style={tabs.wrap}>
    <TabItem
      label="الحالية"
      count={currentCount}
      active={selected === "current"}
      onPress={() => onChange("current")}
    />
    <TabItem
      label="السابقة"
      count={pastCount}
      active={selected === "history"}
      onPress={() => onChange("history")}
    />
  </View>
);

const TabItem = ({
  label,
  count,
  active,
  onPress
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable style={[tabs.item, active && tabs.itemActive]} onPress={onPress}>
    <Text style={[tabs.label, active && tabs.labelActive]}>{label}</Text>
    <View style={[tabs.badge, active && tabs.badgeActive]}>
      <Text style={[tabs.badgeText, active && tabs.badgeTextActive]}>
        {count.toLocaleString("ar-SA")}
      </Text>
    </View>
  </Pressable>
);

const tabs = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
    flexDirection: "row-reverse",
    borderRadius: radius.pill,
    backgroundColor: colors.section,
    padding: 4,
    gap: 4
  },
  item: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.pill
  },
  itemActive: {
    backgroundColor: colors.surface,
    ...shadows.soft
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    fontWeight: "700"
  },
  labelActive: {
    color: colors.text,
    fontWeight: "800"
  },
  badge: {
    minWidth: 22,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  badgeActive: {
    backgroundColor: colors.primary
  },
  badgeText: {
    color: colors.textSecondary,
    fontSize: typography.micro,
    fontWeight: "800"
  },
  badgeTextActive: {
    color: colors.onPrimary
  }
});

// ============================================================
// Page Header
// ============================================================

const PageHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <View style={pageHeader.wrap}>
    <View style={pageHeader.bar} />
    <View style={pageHeader.body}>
      <Text style={pageHeader.title}>{title}</Text>
      {subtitle ? <Text style={pageHeader.subtitle}>{subtitle}</Text> : null}
    </View>
  </View>
);

const pageHeader = StyleSheet.create({
  wrap: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  bar: {
    width: 4,
    height: 28,
    borderRadius: 2,
    backgroundColor: colors.primary
  },
  body: { flex: 1, minWidth: 0 },
  title: {
    color: colors.text,
    fontSize: typography.h1,
    fontWeight: "800",
    textAlign: "right"
  },
  subtitle: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: typography.bodySm,
    textAlign: "right"
  }
});

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120
  },

  // Guest
  guestWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md
  },
  guestCard: {
    marginTop: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.soft
  },
  guestIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  guestTitle: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: "800",
    textAlign: "center"
  },
  guestBody: {
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.xs
  },

  emptyWrap: {
    marginTop: spacing.md
  },
  stack: {
    gap: spacing.sm
  },

  // Error
  errorCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.soft
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.bodySm,
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "700"
  },
  ratingError: {
    marginTop: spacing.xs,
    color: colors.danger,
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "right"
  }
});
