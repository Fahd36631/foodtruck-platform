import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { AppContainer } from "@/ui";
import type { RootStackParamList } from "@/navigation/root-stack";
import { spacing, typography } from "@/theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "PaymentSuccess">;

const SUCCESS = {
  orange: "#FF6B00",
  orangeDark: "#E55A00",
  orangeSoft: "#FFF4EB",
  text: "#0F1B35",
  muted: "#64748B",
  green: "#22C55E",
  border: "#E5EEF7",
  bg: "#F7FAFD",
  white: "#FFFFFF",
  shadow: "rgba(15, 27, 53, 0.08)"
} as const;

const statusTitle = (status: "pending" | "paid") =>
  status === "paid" ? "تم الدفع بنجاح!" : "الدفع قيد المعالجة";

const statusSubtitle = (status: "pending" | "paid") =>
  status === "paid"
    ? "شكرًا لك، تم استلام طلبك بنجاح."
    : "شكرًا لك، تم استلام طلبك وسيتم تأكيد الدفع قريبًا.";

const methodLabel = (method: "card" | "apple_pay" | "mada" | "stc_pay") => {
  if (method === "apple_pay") return "Apple Pay";
  if (method === "mada") return "مدى";
  if (method === "stc_pay") return "STC Pay";
  return "بطاقة بنكية";
};

const fmtAmount = (value: number) =>
  `${value.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} رس`;

export const PaymentSuccessScreen = ({ route, navigation }: Props) => {
  const { orderId, paymentStatus, paymentMethod, subtotal, serviceFee, total } = route.params;
  const isPaid = paymentStatus === "paid";

  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const orderDate = useMemo(
    () =>
      new Date().toLocaleDateString("ar-SA", {
        day: "numeric",
        month: "long",
        year: "numeric"
      }),
    []
  );

  const orderTime = useMemo(
    () =>
      new Date().toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit"
      }),
    []
  );

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true
      })
    ]).start();
  }, [scale, opacity]);

  const handleViewOrder = () => {
    navigation.replace("MainTabs", { screen: "Orders" });
  };

  return (
    <AppContainer edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.confettiWrap}>
            <Animated.View
              style={[
                styles.successCircle,
                !isPaid && styles.successCirclePending,
                { transform: [{ scale }] }
              ]}
            >
              <Ionicons name={isPaid ? "checkmark" : "time-outline"} size={42} color={SUCCESS.white} />
            </Animated.View>
          </View>

          <Animated.View style={{ opacity, width: "100%" }}>
            <Text style={styles.heroTitle}>{statusTitle(paymentStatus)}</Text>
            <Text style={styles.heroSubtitle}>{statusSubtitle(paymentStatus)}</Text>
          </Animated.View>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.orderHead}>
            <View style={styles.orderHeadText}>
              <Text style={styles.orderHeadLabel}>رقم الطلب</Text>
              <Text style={styles.orderHeadValue}>#{orderId.toLocaleString("ar-SA")}</Text>
            </View>
            <View style={styles.receiptIconWrap}>
              <Ionicons name="receipt-outline" size={22} color={SUCCESS.orange} />
            </View>
          </View>

          <View style={styles.dashedDivider} />

          <View style={styles.metaRow}>
            <OrderMetaItem icon="calendar-outline" iconColor={SUCCESS.orange} label="التاريخ" value={orderDate} />
            <OrderMetaItem icon="wallet-outline" iconColor={SUCCESS.green} label="طريقة الدفع" value={methodLabel(paymentMethod)} />
            <OrderMetaItem icon="time-outline" iconColor={SUCCESS.orange} label="وقت الطلب" value={orderTime} />
          </View>
        </View>

        <View style={styles.summaryCard}>
          <SummaryRow label="المجموع الفرعي" value={fmtAmount(subtotal)} />
          <SummaryRow label="رسوم الخدمة" value={fmtAmount(serviceFee)} info />
          <View style={styles.solidDivider} />
          <SummaryRow label="الإجمالي" value={fmtAmount(total)} strong />
        </View>

        <Pressable
          onPress={handleViewOrder}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
        >
          <View style={styles.primaryBtnInner}>
            <Text style={styles.primaryBtnLabel}>عرض الطلب</Text>
            <View style={styles.primaryBtnArrow}>
              <Ionicons name="chevron-back" size={16} color={SUCCESS.orange} />
            </View>
          </View>
        </Pressable>
      </ScrollView>
    </AppContainer>
  );
};

const OrderMetaItem = ({
  icon,
  iconColor,
  label,
  value
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
}) => (
  <View style={metaStyles.item}>
    <Ionicons name={icon} size={18} color={iconColor} />
    <Text style={metaStyles.label}>{label}</Text>
    <Text style={metaStyles.value} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

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
      {info ? <Ionicons name="information-circle-outline" size={14} color={SUCCESS.muted} style={summaryStyles.infoIcon} /> : null}
      <Text style={[summaryStyles.label, strong && summaryStyles.labelStrong]}>{label}</Text>
    </View>
  </View>
);

const metaStyles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 4
  },
  label: {
    color: SUCCESS.muted,
    fontSize: typography.caption,
    fontWeight: "600",
    textAlign: "center"
  },
  value: {
    color: SUCCESS.text,
    fontSize: typography.micro,
    fontWeight: "800",
    textAlign: "center"
  }
});

const summaryStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  labelWrap: {
    flexDirection: "row-reverse",
    alignItems: "center"
  },
  infoIcon: {
    marginLeft: 4
  },
  label: {
    color: SUCCESS.muted,
    fontSize: typography.bodySm,
    fontWeight: "600"
  },
  labelStrong: {
    color: SUCCESS.text,
    fontWeight: "800",
    fontSize: typography.body
  },
  value: {
    color: SUCCESS.text,
    fontSize: typography.bodySm,
    fontWeight: "700"
  },
  valueStrong: {
    color: SUCCESS.orange,
    fontSize: typography.h2,
    fontWeight: "900"
  }
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SUCCESS.bg
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md
  },
  hero: {
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xs
  },
  confettiWrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center"
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: SUCCESS.green,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: SUCCESS.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6
  },
  successCirclePending: {
    backgroundColor: "#F59E0B"
  },
  heroTitle: {
    color: SUCCESS.text,
    fontSize: typography.h1,
    fontWeight: "900",
    textAlign: "center"
  },
  heroSubtitle: {
    marginTop: 6,
    color: SUCCESS.muted,
    fontSize: typography.bodySm,
    lineHeight: 22,
    textAlign: "center"
  },
  detailsCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: SUCCESS.border,
    backgroundColor: SUCCESS.white,
    padding: spacing.md,
    shadowColor: SUCCESS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3
  },
  orderHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  orderHeadText: {
    flex: 1,
    alignItems: "flex-end"
  },
  orderHeadLabel: {
    color: SUCCESS.muted,
    fontSize: typography.caption,
    fontWeight: "600"
  },
  orderHeadValue: {
    marginTop: 4,
    color: SUCCESS.text,
    fontSize: typography.h2,
    fontWeight: "900"
  },
  receiptIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: SUCCESS.orangeSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  dashedDivider: {
    marginVertical: spacing.md,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: SUCCESS.border
  },
  metaRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.xs
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: SUCCESS.border,
    backgroundColor: SUCCESS.white,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: SUCCESS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3
  },
  solidDivider: {
    height: 1,
    backgroundColor: SUCCESS.border,
    marginVertical: 2
  },
  primaryBtn: {
    marginTop: spacing.sm,
    borderRadius: 16,
    backgroundColor: SUCCESS.orange,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: SUCCESS.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4
  },
  primaryBtnPressed: {
    opacity: 0.94,
    backgroundColor: SUCCESS.orangeDark
  },
  primaryBtnInner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  primaryBtnLabel: {
    color: SUCCESS.white,
    fontSize: typography.body,
    fontWeight: "800"
  },
  primaryBtnArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SUCCESS.white,
    alignItems: "center",
    justifyContent: "center"
  }
});
