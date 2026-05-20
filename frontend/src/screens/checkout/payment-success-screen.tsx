import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AppButton, AppContainer } from "@/ui";
import type { RootStackParamList } from "@/navigation/root-stack";
import { colors, iconSize, radius, shadows, spacing, typography } from "@/theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "PaymentSuccess">;

const statusLabel = (status: "pending" | "paid") =>
  status === "paid" ? "تم الدفع بنجاح" : "الدفع قيد المعالجة";

const methodLabel = (method: "card" | "apple_pay" | "mada" | "stc_pay") => {
  if (method === "apple_pay") return "Apple Pay";
  if (method === "mada") return "مدى";
  if (method === "stc_pay") return "STC Pay";
  return "بطاقة بنكية";
};

export const PaymentSuccessScreen = ({ route, navigation }: Props) => {
  const { orderId, paymentStatus, paymentMethod } = route.params;
  const isPaid = paymentStatus === "paid";

  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

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

  const gradientColors: readonly [string, string, string] = isPaid
    ? ["#FFFFFF", "#FFF7EF", "#FFEFD9"]
    : ["#FFFFFF", "#FFF9E6", "#FFF1C2"];

  return (
    <AppContainer edges={["top"]}>
      <View style={styles.wrap}>
        <LinearGradient colors={gradientColors} style={styles.card}>
          <Animated.View
            style={[
              styles.iconRing,
              isPaid ? styles.iconRingOk : styles.iconRingPending,
              { transform: [{ scale }] }
            ]}
          >
            <Ionicons
              name={isPaid ? "checkmark" : "time-outline"}
              size={iconSize.xl}
              color={colors.onPrimary}
            />
          </Animated.View>

          <Animated.View style={[styles.textBlock, { opacity }]}>
            <Text style={styles.title}>{statusLabel(paymentStatus)}</Text>
            <View style={styles.divider} />
            <View style={styles.metaRow}>
              <Ionicons name="receipt-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaLabel}>رقم الطلب</Text>
              <Text style={styles.metaValue}>#{orderId.toLocaleString("ar-SA")}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="card-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaLabel}>طريقة الدفع</Text>
              <Text style={styles.metaValue}>{methodLabel(paymentMethod)}</Text>
            </View>
            <Text style={styles.hint}>
              {isPaid
                ? "سيبدأ الترك بتحضير طلبك فور الاستلام. تابع الحالة من شاشة الطلبات."
                : "بمجرد تأكيد الدفع سيبدأ التحضير. يمكنك المتابعة من شاشة الطلبات."}
            </Text>
          </Animated.View>
        </LinearGradient>

        <View style={styles.actions}>
          <AppButton
            label="عرض طلباتي"
            onPress={() => navigation.replace("MainTabs", { screen: "Orders" })}
            variant="primary"
            fullWidth
            size="lg"
          />
          <AppButton
            label="العودة للرئيسية"
            onPress={() => navigation.replace("MainTabs", { screen: "Home" })}
            variant="secondary"
            fullWidth
          />
        </View>
      </View>
    </AppContainer>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.md
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    ...shadows.soft
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.cta
  },
  iconRingOk: {
    backgroundColor: colors.success
  },
  iconRingPending: {
    backgroundColor: colors.warning
  },
  textBlock: {
    width: "100%",
    alignItems: "center",
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontSize: typography.h1,
    fontWeight: "800",
    textAlign: "center"
  },
  divider: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginVertical: spacing.xs
  },
  metaRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  metaLabel: {
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    fontWeight: "600"
  },
  metaValue: {
    color: colors.text,
    fontSize: typography.bodySm,
    fontWeight: "800"
  },
  hint: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typography.caption,
    textAlign: "center",
    lineHeight: 22,
    writingDirection: "rtl"
  },
  actions: {
    gap: spacing.sm
  }
});
