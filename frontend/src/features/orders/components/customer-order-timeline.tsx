import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, iconSize, radius, spacing, typography } from "@/theme/tokens";

type OrderStatus = "pending" | "preparing" | "ready" | "picked_up" | "cancelled";
type StepState = "done" | "active" | "pending";

type CustomerOrderTimelineProps = {
  status: OrderStatus;
};

const STEPS = [
  { key: "pending", label: "تم استلام الطلب", icon: "bag-outline" as const },
  { key: "preparing", label: "قيد التحضير", icon: "restaurant-outline" as const },
  { key: "ready", label: "جاهز للاستلام", icon: "bag-check-outline" as const },
  { key: "picked_up", label: "تم التسليم", icon: "checkmark" as const }
] as const;

const statusIndex = (status: OrderStatus) => {
  if (status === "cancelled") return -1;
  return STEPS.findIndex((step) => step.key === status);
};

const stateFor = (currentIndex: number, index: number): StepState => {
  if (currentIndex < 0) return "pending";
  if (index < currentIndex) return "done";
  if (index === currentIndex) return "active";
  return "pending";
};

const activeTone = (status: OrderStatus, index: number) => {
  if (status === "ready" && index === 2) return "green" as const;
  if (status === "picked_up") return "green" as const;
  return "orange" as const;
};

export const CustomerOrderTimeline = ({ status }: CustomerOrderTimelineProps) => {
  if (status === "cancelled") {
    return (
      <View style={styles.cancelledWrap}>
        <Ionicons name="close-circle-outline" size={iconSize.md} color={colors.danger} />
        <Text style={styles.cancelledText}>تم إلغاء الطلب</Text>
      </View>
    );
  }

  const currentIndex = statusIndex(status);
  const effectiveIndex = status === "picked_up" ? STEPS.length : currentIndex;

  return (
    <View style={styles.wrap}>
      <View style={styles.trackRow}>
        {STEPS.map((step, index) => {
          const stepState = stateFor(effectiveIndex, index);
          const isLast = index === STEPS.length - 1;
          const tone = stepState === "active" ? activeTone(status, index) : stepState === "done" ? "green" : "muted";
          const connectorOn = stepState === "done" || (stepState === "active" && currentIndex > index);

          return (
            <View key={step.key} style={styles.stepCol}>
              <View style={styles.nodeRow}>
                <View
                  style={[
                    styles.node,
                    tone === "green" && styles.nodeGreen,
                    tone === "orange" && styles.nodeOrange,
                    tone === "muted" && styles.nodeMuted
                  ]}
                >
                  {stepState === "done" ? (
                    <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
                  ) : (
                    <Ionicons
                      name={step.icon}
                      size={14}
                      color={tone === "muted" ? colors.textMuted : colors.onPrimary}
                    />
                  )}
                </View>
                {!isLast ? (
                  <View style={styles.connector}>
                    <View style={[styles.connectorFill, connectorOn && (tone === "green" ? styles.connectorGreen : styles.connectorOrange)]} />
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.label,
                  stepState === "active" && tone === "orange" && styles.labelActiveOrange,
                  (stepState === "active" && tone === "green") || stepState === "done" ? styles.labelActiveGreen : null,
                  stepState === "pending" && styles.labelMuted
                ]}
                numberOfLines={2}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: "100%"
  },
  trackRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start"
  },
  stepCol: {
    flex: 1,
    alignItems: "center",
    minWidth: 0
  },
  nodeRow: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center"
  },
  node: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5
  },
  nodeOrange: {
    borderColor: colors.primary,
    backgroundColor: colors.primary
  },
  nodeGreen: {
    borderColor: colors.success,
    backgroundColor: colors.success
  },
  nodeMuted: {
    borderColor: colors.border,
    backgroundColor: colors.surface2
  },
  connector: {
    flex: 1,
    height: 2,
    marginHorizontal: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.bgDeep,
    overflow: "hidden"
  },
  connectorFill: {
    flex: 1,
    height: "100%",
    backgroundColor: colors.bgDeep
  },
  connectorOrange: {
    backgroundColor: colors.primary
  },
  connectorGreen: {
    backgroundColor: colors.success
  },
  label: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    color: colors.text
  },
  labelActiveOrange: {
    color: colors.primaryDark,
    fontWeight: "800"
  },
  labelActiveGreen: {
    color: colors.success,
    fontWeight: "800"
  },
  labelMuted: {
    color: colors.textMuted,
    fontWeight: "600"
  },
  cancelledWrap: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(230, 57, 70, 0.35)",
    backgroundColor: colors.dangerMuted
  },
  cancelledText: {
    color: colors.danger,
    fontSize: typography.caption,
    fontWeight: "800"
  }
});
