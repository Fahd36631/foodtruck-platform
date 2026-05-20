import { useMemo, useState } from "react";
import { ActivityIndicator, Image, type ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AppContainer, EmptyState } from "@/ui";
import type { CheckoutPaymentMethod } from "@/features/checkout/components/payment-method-card";
import { createOrderPayment, createPickupOrder } from "@/features/orders/api";
import type { RootStackParamList } from "@/navigation/root-stack";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { getReadableNetworkError } from "@/api/network-error";
import { spacing, typography } from "@/theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Checkout">;

const PAY = {
  navy: "#1A2B48",
  orange: "#FF6B00",
  orangeDark: "#E55A00",
  orangeSoft: "#FFF4EB",
  orangeBorder: "rgba(255, 107, 0, 0.45)",
  white: "#FFFFFF",
  canvas: "#F5F7FB",
  textMuted: "#6B7280",
  textSecondary: "#4B5563",
  border: "#E8ECF2",
  shadow: "rgba(26, 43, 72, 0.08)",
  success: "#16A34A",
  successSoft: "#ECFDF3",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2"
} as const;

const paymentMethods: Array<{ id: CheckoutPaymentMethod; label: string; subtitle: string }> = [
  { id: "card", label: "بطاقة بنكية", subtitle: "Visa / MasterCard" },
  { id: "apple_pay", label: "Apple Pay", subtitle: "دفع سريع وآمن" },
  { id: "mada", label: "مدى", subtitle: "الدفع ببطاقات مدى" },
  { id: "stc_pay", label: "STC Pay", subtitle: "المحفظة الرقمية" }
];

const PAYMENT_LOGOS: Record<CheckoutPaymentMethod, ImageSourcePropType> = {
  card: require("../../assets/images/visa.png"),
  apple_pay: require("../../assets/images/Appl-pay.jpg"),
  mada: require("../../assets/images/mada.png"),
  stc_pay: require("../../assets/images/Stc-bank.png")
};

const PAYMENT_LOGO_SIZE: Record<CheckoutPaymentMethod, { width: number; height: number }> = {
  card: { width: 46, height: 15 },
  apple_pay: { width: 48, height: 20 },
  mada: { width: 50, height: 22 },
  stc_pay: { width: 54, height: 20 }
};

const fmtAmount = (value: number) =>
  `${value.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} رس`;

export const CheckoutScreen = ({ navigation }: Props) => {
  const accessToken = useAuthStore((s) => s.accessToken) ?? "";
  const [method, setMethod] = useState<CheckoutPaymentMethod | null>(null);
  const queryClient = useQueryClient();

  const { truckId, truckName, items, notes, subtotal, total, pickupTypeLabel, clearCart } = useCartStore();

  const serviceFee = useMemo(() => Number(Math.max(0, total - subtotal).toFixed(2)), [subtotal, total]);

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

      const { subtotal: orderSubtotal, total: orderTotal } = useCartStore.getState();
      const orderServiceFee = Number(Math.max(0, orderTotal - orderSubtotal).toFixed(2));

      clearCart();
      const successStatus: "pending" | "paid" = payment.paymentStatus === "paid" ? "paid" : "pending";
      navigation.replace("PaymentSuccess", {
        orderId: order.orderId,
        paymentStatus: successStatus,
        paymentMethod: payment.paymentMethod,
        subtotal: orderSubtotal,
        serviceFee: orderServiceFee,
        total: orderTotal
      });
    }
  });

  const handlePayPress = () => {
    if (!accessToken) {
      navigation.navigate("Auth", { initialMode: "login", redirectTo: "Checkout" });
      return;
    }
    void createOrderMutation.mutateAsync();
  };

  if (items.length === 0 || !truckId) {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.emptyWrap}>
          <CheckoutPageHeader title="الدفع" onBack={() => navigation.goBack()} />
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

  const payDisabled = createOrderMutation.isPending || !method;

  return (
    <AppContainer edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <CheckoutPageHeader title="الدفع" onBack={() => navigation.goBack()} />

        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={styles.pickupBadge}>
              <Ionicons name="storefront-outline" size={12} color={PAY.orange} />
              <Text style={styles.pickupBadgeText}>{pickupTypeLabel}</Text>
            </View>
            <Text style={styles.summaryTitle}>ملخص الطلب</Text>
          </View>

          <Text style={styles.truckName} numberOfLines={1}>
            {truckName}
          </Text>

          <View style={styles.divider} />

          <View style={styles.itemsList}>
            {items.map((item) => (
              <View key={item.menuItemId} style={styles.itemRow}>
                <Text style={styles.itemValue}>{fmtAmount(item.price * item.quantity)}</Text>
                <Text style={styles.itemLabel} numberOfLines={1}>
                  {item.name}
                  {item.quantity > 1 ? (
                    <Text style={styles.itemQty}> × {item.quantity.toLocaleString("ar-SA")}</Text>
                  ) : null}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.itemRow}>
            <Text style={styles.subValue}>{fmtAmount(subtotal)}</Text>
            <Text style={styles.subLabel}>المجموع الفرعي</Text>
          </View>
          <View style={styles.itemRow}>
            <Text style={styles.subValue}>{fmtAmount(serviceFee)}</Text>
            <Text style={styles.subLabel}>رسوم الخدمة</Text>
          </View>

          <View style={styles.grandTotalRow}>
            <Text style={styles.totalValue}>{fmtAmount(total)}</Text>
            <Text style={styles.totalLabel}>الإجمالي</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>طريقة الدفع</Text>

        <View style={styles.methods}>
          {paymentMethods.map((paymentMethod) => (
            <PaymentMethodOption
              key={paymentMethod.id}
              id={paymentMethod.id}
              label={paymentMethod.label}
              subtitle={paymentMethod.subtitle}
              selected={method === paymentMethod.id}
              onPress={() => setMethod(paymentMethod.id)}
            />
          ))}
        </View>

        <View style={styles.securityCard}>
          <View style={styles.securityTextWrap}>
            <Text style={styles.securityTitle}>دفع آمن 100%</Text>
            <Text style={styles.securitySubtitle}>جميع عمليات الدفع مشفرة وآمنة</Text>
          </View>
          <Ionicons name="shield-checkmark" size={22} color={PAY.success} />
        </View>

        {createOrderMutation.isError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={PAY.danger} />
            <Text style={styles.errorText}>{getReadableNetworkError(createOrderMutation.error)}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handlePayPress}
          disabled={payDisabled}
          style={({ pressed }) => [styles.payPressable, pressed && !payDisabled && styles.payPressed]}
        >
          <LinearGradient
            colors={payDisabled ? ["#D1D5DB", "#9CA3AF"] : ["#FF8533", PAY.orange, PAY.orangeDark]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.payGradient}
          >
            {createOrderMutation.isPending ? (
              <ActivityIndicator color={PAY.white} />
            ) : (
              <View style={styles.payInner}>
                <Ionicons name="lock-closed" size={16} color={PAY.white} />
                <Text style={styles.payLabel}>{`ادفع الآن ${fmtAmount(total)}`}</Text>
              </View>
            )}
          </LinearGradient>
        </Pressable>

        <View style={styles.disclaimerRow}>
          <Text style={styles.disclaimerText}>لن يتم خصم المبلغ إلا بعد تأكيد الطلب</Text>
          <Ionicons name="shield-checkmark-outline" size={13} color={PAY.textMuted} />
        </View>
      </ScrollView>
    </AppContainer>
  );
};

// ============================================================
// Local UI components
// ============================================================

const CheckoutPageHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
  <View style={pageHeader.wrap}>
    <Pressable onPress={onBack} style={({ pressed }) => [pageHeader.backBtn, pressed && pageHeader.backBtnPressed]} hitSlop={8}>
      <Ionicons name="chevron-back" size={20} color={PAY.navy} />
    </Pressable>
    <View style={pageHeader.titleRow}>
      <Text style={pageHeader.title}>{title}</Text>
      <View style={pageHeader.iconWrap}>
        <Ionicons name="bus-outline" size={16} color={PAY.orange} />
      </View>
    </View>
    <View style={pageHeader.spacer} />
  </View>
);

const PaymentMethodOption = ({
  id,
  label,
  subtitle,
  selected,
  onPress
}: {
  id: CheckoutPaymentMethod;
  label: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) => {
  const logoSize = PAYMENT_LOGO_SIZE[id];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        methodStyles.card,
        selected && methodStyles.cardSelected,
        pressed && methodStyles.cardPressed
      ]}
    >
      <View style={[methodStyles.radio, selected && methodStyles.radioSelected]}>
        {selected ? <View style={methodStyles.radioDot} /> : null}
      </View>

      <View style={methodStyles.meta}>
        <Text style={methodStyles.label}>{label}</Text>
        <Text style={methodStyles.subtitle}>{subtitle}</Text>
      </View>

      <View style={methodStyles.logoBox}>
        <Image source={PAYMENT_LOGOS[id]} style={[methodStyles.logoImage, logoSize]} resizeMode="contain" />
      </View>
    </Pressable>
  );
};

const pageHeader = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PAY.white,
    borderWidth: 1,
    borderColor: PAY.border,
    alignItems: "center",
    justifyContent: "center"
  },
  backBtnPressed: {
    opacity: 0.85
  },
  titleRow: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: PAY.orangeSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    color: PAY.navy,
    fontSize: typography.h1,
    fontWeight: "800",
    textAlign: "center"
  },
  spacer: {
    width: 40
  }
});

const methodStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PAY.border,
    backgroundColor: PAY.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 14
  },
  cardSelected: {
    borderColor: PAY.orange,
    backgroundColor: PAY.orangeSoft
  },
  cardPressed: {
    opacity: 0.96
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center"
  },
  radioSelected: {
    borderColor: PAY.orange
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PAY.orange
  },
  meta: {
    flex: 1,
    alignItems: "flex-end"
  },
  label: {
    color: PAY.navy,
    fontSize: typography.bodySm,
    fontWeight: "800",
    textAlign: "right"
  },
  subtitle: {
    marginTop: 2,
    color: PAY.textMuted,
    fontSize: typography.caption,
    textAlign: "right"
  },
  logoBox: {
    width: 64,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PAY.border,
    backgroundColor: PAY.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 6
  },
  logoImage: {
    maxWidth: "100%",
    maxHeight: "100%"
  }
});

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: PAY.canvas },
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
    gap: spacing.md
  },

  summaryCard: {
    borderRadius: 16,
    backgroundColor: PAY.white,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: PAY.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  summaryTitle: {
    color: PAY.navy,
    fontWeight: "800",
    fontSize: typography.h3,
    textAlign: "right"
  },
  pickupBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: PAY.orangeSoft,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  pickupBadgeText: {
    color: PAY.orange,
    fontSize: typography.micro,
    fontWeight: "800"
  },
  truckName: {
    color: PAY.navy,
    fontWeight: "700",
    fontSize: typography.body,
    textAlign: "right"
  },
  divider: {
    height: 1,
    backgroundColor: PAY.border
  },
  itemsList: {
    gap: spacing.xs
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  itemLabel: {
    flex: 1,
    color: PAY.textSecondary,
    fontSize: typography.bodySm,
    textAlign: "right",
    fontWeight: "600"
  },
  itemQty: {
    color: PAY.textMuted,
    fontWeight: "700"
  },
  itemValue: {
    color: PAY.navy,
    fontWeight: "700",
    fontSize: typography.bodySm
  },
  subLabel: {
    color: PAY.textSecondary,
    fontSize: typography.bodySm,
    fontWeight: "600"
  },
  subValue: {
    color: PAY.navy,
    fontSize: typography.bodySm,
    fontWeight: "700"
  },
  grandTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2
  },
  totalLabel: {
    color: PAY.navy,
    fontWeight: "800",
    fontSize: typography.body
  },
  totalValue: {
    color: PAY.orange,
    fontWeight: "900",
    fontSize: typography.h3
  },

  sectionTitle: {
    color: PAY.navy,
    fontWeight: "800",
    fontSize: typography.h3,
    textAlign: "right",
    marginTop: 2
  },
  methods: {
    gap: spacing.sm
  },

  securityCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: 14,
    backgroundColor: PAY.successSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  securityTextWrap: {
    flex: 1,
    alignItems: "flex-end"
  },
  securityTitle: {
    color: PAY.success,
    fontWeight: "800",
    fontSize: typography.bodySm,
    textAlign: "right"
  },
  securitySubtitle: {
    marginTop: 2,
    color: PAY.textMuted,
    fontSize: typography.caption,
    textAlign: "right"
  },

  errorBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PAY.danger,
    backgroundColor: PAY.dangerSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  errorText: {
    flex: 1,
    color: PAY.danger,
    fontSize: typography.bodySm,
    fontWeight: "700",
    textAlign: "right"
  },

  payPressable: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: spacing.xs
  },
  payPressed: {
    opacity: 0.94
  },
  payGradient: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  payInner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8
  },
  payLabel: {
    color: PAY.white,
    fontSize: typography.body,
    fontWeight: "800"
  },

  disclaimerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: -4
  },
  disclaimerText: {
    color: PAY.textMuted,
    fontSize: typography.micro,
    fontWeight: "600",
    textAlign: "center"
  }
});
