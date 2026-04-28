import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, iconSize, radius, spacing, typography } from "@/theme/tokens";

export type CheckoutPaymentMethod = "card" | "apple_pay" | "mada" | "stc_pay";

type PaymentMethodCardProps = {
  id: CheckoutPaymentMethod;
  label: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
};

const logoFor = (id: CheckoutPaymentMethod) => {
  if (id === "apple_pay") return { icon: "logo-apple", text: "Apple" };
  if (id === "mada") return { icon: "card-outline", text: "mada" };
  if (id === "stc_pay") return { icon: "phone-portrait-outline", text: "stc" };
  return { icon: "card-outline", text: "VISA" };
};

export const PaymentMethodCard = ({ id, label, subtitle, selected, onPress }: PaymentMethodCardProps) => {
  const logo = logoFor(id);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.cardPressed]}>
      <View style={styles.left}>
        <View style={[styles.logoWrap, selected && styles.logoWrapSelected]}>
          <Ionicons name={logo.icon as keyof typeof Ionicons.glyphMap} size={iconSize.md} color={colors.brandBlue} />
          <Text style={styles.logoText}>{logo.text}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={[styles.checkWrap, selected && styles.checkWrapSelected]}>
        {selected ? <Ionicons name="checkmark" size={iconSize.sm} color={colors.onPrimary} /> : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  cardPressed: {
    transform: [{ scale: 0.995 }]
  },
  left: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm
  },
  logoWrap: {
    minWidth: 72,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingVertical: 8,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  logoWrapSelected: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface
  },
  logoText: {
    color: colors.textMuted,
    fontSize: typography.micro,
    fontWeight: "800"
  },
  meta: {
    flex: 1,
    alignItems: "flex-end"
  },
  label: {
    color: colors.text,
    fontSize: typography.bodySm,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: 2,
    fontSize: typography.caption
  },
  checkWrap: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2
  },
  checkWrapSelected: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  }
});
