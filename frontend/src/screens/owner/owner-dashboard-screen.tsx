import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppButton, AppContainer, LoadingSkeleton } from "@/ui";
import { getIncomingOwnerOrders, updatePickupOrderStatus } from "@/features/orders/api";
import { getReadableNetworkError } from "@/api/network-error";
import { useAuthStore } from "@/store/auth-store";
import { colors, radius, shadows, spacing, typography } from "@/theme/tokens";

const statusToArabic: Record<string, string> = {
  pending: "جديد",
  preparing: "قيد التحضير",
  ready: "جاهز للاستلام",
  picked_up: "تم الاستلام",
  cancelled: "ملغي"
};

export const OwnerDashboardScreen = () => {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken) ?? "";
  const roleCode = useAuthStore((s) => s.user?.roleCode);

  const incomingOrders = useQuery({
    queryKey: ["owner-incoming-orders", accessToken],
    queryFn: () => getIncomingOwnerOrders(accessToken),
    enabled: !!accessToken
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: "preparing" | "ready" | "picked_up" }) =>
      updatePickupOrderStatus(orderId, status, accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner-incoming-orders"] });
    }
  });

  if (!accessToken || roleCode !== "truck_owner") {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.pad}>
          <Text style={styles.title}>لوحة التشغيل</Text>
          <Text style={styles.sub}>هذه الصفحة مخصصة لحساب صاحب الترك.</Text>
        </View>
      </AppContainer>
    );
  }

  if (incomingOrders.isLoading) {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.pad}>
          <Text style={styles.title}>لوحة التشغيل</Text>
          <LoadingSkeleton rows={5} />
        </View>
      </AppContainer>
    );
  }

  if (incomingOrders.isError) {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.pad}>
          <Text style={styles.title}>لوحة التشغيل</Text>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{getReadableNetworkError(incomingOrders.error)}</Text>
            <AppButton label="إعادة المحاولة" onPress={() => void incomingOrders.refetch()} variant="primary" fullWidth />
          </View>
        </View>
      </AppContainer>
    );
  }

  return (
    <AppContainer edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>لوحة التشغيل</Text>
        <Text style={styles.sub}>متابعة الطلبات للاستلام من موقع الترك (بدون توصيل).</Text>

        {(incomingOrders.data ?? []).length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>لا طلبات في هذه اللحظة</Text>
            <Text style={styles.emptyBody}>استخدم تبويب «طلبات الوارد» للواجهة الكاملة والفلاتر.</Text>
          </View>
        ) : null}

        {(incomingOrders.data ?? []).map((order) => (
          <View key={order.id} style={styles.card}>
            <Text style={styles.cardTitle}>{order.truck_name}</Text>
            <Text style={styles.line}>الطلب: #{order.order_number}</Text>
            <Text style={styles.line}>العميل: {order.customer_name}</Text>
            <Text style={styles.line}>الحالة: {statusToArabic[order.status] ?? order.status}</Text>
            <View style={styles.actions}>
              {order.status === "pending" ? (
                <AppButton label="بدء التحضير" onPress={() => updateStatusMutation.mutate({ orderId: order.id, status: "preparing" })} variant="primary" fullWidth />
              ) : null}
              {order.status === "preparing" ? (
                <AppButton label="جاهز للاستلام" onPress={() => updateStatusMutation.mutate({ orderId: order.id, status: "ready" })} variant="primary" fullWidth />
              ) : null}
              {order.status === "ready" ? (
                <AppButton label="تم التسليم للعميل" onPress={() => updateStatusMutation.mutate({ orderId: order.id, status: "picked_up" })} variant="secondary" fullWidth />
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>
    </AppContainer>
  );
};

const styles = StyleSheet.create({
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
  title: {
    color: colors.brandBlue,
    fontSize: typography.h1,
    fontWeight: "800",
    letterSpacing: 0.2
  },
  sub: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    lineHeight: 22
  },
  errorBox: {
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
  emptyCard: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.soft
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.h3
  },
  emptyBody: {
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    fontSize: typography.bodySm
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
    ...shadows.soft
  },
  cardTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.h3
  },
  line: {
    color: colors.textSecondary,
    fontSize: typography.bodySm
  },
  actions: {
    marginTop: spacing.sm,
    gap: spacing.sm
  }
});
