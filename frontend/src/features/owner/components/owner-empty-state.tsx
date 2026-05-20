import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AppButton } from "@/ui";
import { OWNER, ownerRadius, ownerShadow } from "@/features/owner/theme";
import { typography } from "@/theme/tokens";

type OwnerEmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export const OwnerEmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary
}: OwnerEmptyStateProps) => (
  <View style={styles.card}>
    <LinearGradient colors={["#FFB703", "#FF8533", "#FF6B00"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconRing}>
      <View style={styles.iconInner}>
        <Ionicons name={icon} size={30} color={OWNER.orange} />
      </View>
    </LinearGradient>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
    {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} variant="primary" size="lg" fullWidth /> : null}
    {secondaryLabel && onSecondary ? (
      <AppButton label={secondaryLabel} onPress={onSecondary} variant="secondary" fullWidth />
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: ownerRadius.card,
    borderWidth: 1,
    borderColor: OWNER.border,
    backgroundColor: OWNER.white,
    padding: 20,
    alignItems: "center",
    gap: 12,
    ...ownerShadow
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    padding: 3
  },
  iconInner: {
    width: "100%",
    height: "100%",
    borderRadius: 33,
    backgroundColor: OWNER.white,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    color: OWNER.text,
    fontSize: typography.h2,
    fontWeight: "900",
    textAlign: "center",
    writingDirection: "rtl"
  },
  description: {
    color: OWNER.muted,
    fontSize: typography.bodySm,
    lineHeight: 22,
    textAlign: "center",
    writingDirection: "rtl"
  }
});
