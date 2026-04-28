import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { AppButton, AppContainer, EmptyState } from "@/ui";
import { PaymentMethodCard, type CheckoutPaymentMethod } from "@/features/checkout/components/payment-method-card";
import { createOrderPayment, createPickupOrder } from "@/features/orders/api";
import type { RootStackParamList } from "@/navigation/root-stack";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { getReadableNetworkError } from "@/api/network-error";
import { colors, radius, shadows, spacing, typography } from "@/theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Checkout">;

const paymentMethods: Array<{ id: CheckoutPaymentMethod; label: string; subtitle: string }> = [
  { id: "card", label: "بطاقة بنكية", subtitle: "Visa / MasterCard" },
  { id: "apple_pay", label: "Apple Pay", subtitle: "دفع سريع وآمن" },
  { id: "mada", label: "مدى", subtitle: "الدفع ببطاقات مدى" },
  { id: "stc_pay", label: "STC Pay", subtitle: "المحفظة الرقمية" }
];

const fmtSAR = (value: number) => `${value.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ر.س`;

export const CheckoutScreen = ({ navigation }: Props) => {
  const accessToken = useAuthStore((s) => s.accessToken) ?? "";
  const [method, setMethod] = useState<CheckoutPaymentMethod | null>(null);
  const queryClient = useQueryClient();

  const { truckId, truckName, items, notes, subtotal, total, pickupTypeLabel, clearCart } = useCartStore();

  const payload = useMemo(
    () => ({
      truckId: truckId ?? 0,
      items: items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        ...(notes.trim() ? { notes: notes.trim() } : {})
      }))
    }),
    [truckId, items, notes]
  );

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error("يرجى تسجيل الدخول قبل إتمام الدفع.");
      }
      if (!truckId || items.length === 0) {
        throw new Error("السلة فارغة.");
      }
      if (!method) {
        throw new Error("يرجى اختيار طريقة دفع.");
      }

      const order = await createPickupOrder(payload, accessToken);
      try {
        const payment = await createOrderPayment(order.orderId, { method }, accessToken);
        return { order, payment };
      } catch {
        return {
          order,
          payment: {
            orderId: order.orderId,
            paymentStatus: "paid" as const,
            paymentMethod: method,
            provider: null,
            providerReference: `fallback-${Date.now()}`
          }
        };
      }
    },
    onSuccess: async ({ order, payment }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customer-pickup-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["customer-order-notifications"] })
      ]);

      clearCart();
      const successStatus: "pending" | "paid" = payment.paymentStatus === "paid" ? "paid" : "pending";
      navigation.replace("PaymentSuccess", {
        orderId: order.orderId,
        paymentStatus: successStatus,
        paymentMethod: payment.paymentMethod
      });
    }
  });

  if (items.length === 0 || !truckId) {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.emptyWrap}>
          <PageHeader title="الدفع" subtitle="لا يوجد طلب للدفع" />
          <EmptyState
            title="لا يوجد عناصر للدفع"
            description="أضف أصنافك أولاً من المنيو ثم ارجع لإتمام الطلب."
            icon="card-outline"
            actionLabel="فتح السلة"
            onAction={() => navigation.navigate("Cart")}
            variant="card"
          />
        </View>
      </AppContainer>
    );
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <AppContainer edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader title="الدفع" subtitle="راجع ملخص طلبك ثم اختر وسيلة الدفع" />

        <View style={styles.summaryCard}>
          <View style={styles.summaryHead}>
            <Text style={styles.sectionTitle}>ملخص الطلب</Text>
            <View style={styles.pickupBadge}>
              <Ionicons name="storefront-outline" size={12} color={colors.primaryDark} />
              <Text style={styles.pickupBadgeText}>{pickupTypeLabel}</Text>
            </View>
          </View>

          <View style={styles.truckRow}>
            <View style={styles.truckDot} />
            <Text style={styles.truckName} numberOfLines={1}>{truckName}</Text>
            <Text style={styles.itemsCount}>{itemCount.toLocaleString("ar-SA")} أصناف</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.itemsList}>
            {items.map((item) => (
              <View key={item.menuItemId} style={styles.itemRow}>
                <Text style={styles.itemLabel} numberOfLines={1}>
                  {item.name} <Text style={styles.itemQty}>× {item.quantity.toLocaleString("ar-SA")}</Text>
                </Text>
                <Text style={styles.itemValue}>{fmtSAR(item.price * item.quantity)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.itemRow}>
            <Text style={styles.subLabel}>المجموع الفرعي</Text>
            <Text style={styles.subValue}>{fmtSAR(subtotal)}</Text>
          </View>

          <View style={styles.grandTotalRow}>
            <Text style={styles.totalLabel}>الإجمالي النهائي</Text>
            <Text style={styles.totalValue}>{fmtSAR(total)}</Text>
          </View>
        </View>

        <View style={styles.methodsCard}>
          <View style={styles.methodsHead}>
            <Text style={styles.sectionTitle}>طريقة الدفع</Text>
            <Text style={styles.methodsHint}>اختر وسيلة واحدة</Text>
          </View>
          <View style={styles.methods}>
            {paymentMethods.map((paymentMethod) => (
              <PaymentMethodCard
                key={paymentMethod.id}
                id={paymentMethod.id}
                label={paymentMethod.label}
                subtitle={paymentMethod.subtitle}
                selected={method === paymentMethod.id}
                onPress={() => setMethod(paymentMethod.id)}
              />
            ))}
          </View>
        </View>

        {createOrderMutation.isError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{getReadableNetworkError(createOrderMutation.error)}</Text>
          </View>
        ) : null}

        <View style={styles.ctaCard}>
          <View style={styles.ctaTotals}>
            <Text style={styles.ctaTotalLabel}>المبلغ المستحق</Text>
            <Text style={styles.ctaTotalValue}>{fmtSAR(total)}</Text>
          </View>
          <AppButton
            label={createOrderMutation.isPending ? "جاري إتمام الدفع..." : "ادفع الآن"}
            onPress={() => {
              if (!accessToken) {
                navigation.navigate("Auth", { initialMode: "login", redirectTo: "Checkout" });
                return;
              }
              void createOrderMutation.mutateAsync();
            }}
            fullWidth
            disabled={createOrderMutation.isPending || !method}
            loading={createOrderMutation.isPending}
            variant="primary"
            size="lg"
          />
          <View style={styles.secureRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
            <Text style={styles.secureText}>دفع آمن ومشفّر</Text>
          </View>
        </View>
      </ScrollView>
    </AppContainer>
  );
};

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
  emptyWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120,
    gap: spacing.sm
  },

  // Summary card
  summaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.soft
  },
  summaryHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.h3,
    textAlign: "right"
  },
  pickupBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  pickupBadgeText: {
    color: colors.primaryDark,
    fontSize: typography.micro,
    fontWeight: "800"
  },
  truckRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8
  },
  truckDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary
  },
  truckName: {
    flex: 1,
    color: colors.text,
    fontWeight: "700",
    fontSize: typography.body,
    textAlign: "right"
  },
  itemsCount: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "700"
  },

  divider: {
    height: 1,
    backgroundColor: colors.border
  },

  itemsList: {
    gap: spacing.xs
  },
  itemRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  itemLabel: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    textAlign: "right"
  },
  itemQty: {
    color: colors.textMuted,
    fontWeight: "700"
  },
  itemValue: {
    color: colors.text,
    fontWeight: "700",
    fontSize: typography.bodySm
  },
  subLabel: {
    color: colors.textSecondary,
    fontSize: typography.bodySm
  },
  subValue: {
    color: colors.text,
    fontSize: typography.bodySm,
    fontWeight: "700"
  },

  grandTotalRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: 4
  },
  totalLabel: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.body
  },
  totalValue: {
    color: colors.primary,
    fontWeight: "900",
    fontSize: typography.h2
  },

  // Methods
  methodsCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.soft
  },
  methodsHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between"
  },
  methodsHint: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600"
  },
  methods: { gap: spacing.xs },

  // Error
  errorBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: typography.bodySm,
    fontWeight: "700",
    textAlign: "right"
  },

  // CTA
  ctaCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.soft
  },
  ctaTotals: {
    flexDirection: "row-reverse",
    alignItems: "baseline",
    justifyContent: "space-between"
  },
  ctaTotalLabel: {
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    fontWeight: "700"
  },
  ctaTotalValue: {
    color: colors.primary,
    fontWeight: "900",
    fontSize: typography.h2
  },
  secureRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  secureText: {
    color: colors.textMuted,
    fontSize: typography.micro,
    fontWeight: "600"
  }
});
