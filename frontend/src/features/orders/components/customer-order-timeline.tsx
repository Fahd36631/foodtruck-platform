import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, iconSize, radius, spacing, typography } from "@/theme/tokens";

type StepState = "done" | "active" | "pending";

type CustomerOrderTimelineProps = {
  status: "pending" | "preparing" | "ready" | "picked_up" | "cancelled";
};

const steps = [
  { key: "pending", label: "تم استلام الطلب", icon: "receipt-outline" },
  { key: "preparing", label: "قيد التحضير", icon: "flame-outline" },
  { key: "ready", label: "جاهز للاستلام", icon: "checkmark-circle-outline" },
  { key: "picked_up", label: "تم التسليم", icon: "bag-check-outline" }
] as const;

const statusIndex = (status: CustomerOrderTimelineProps["status"]) => {
  if (status === "cancelled") return -1;
  return steps.findIndex((step) => step.key === status);
};

const stateFor = (currentIndex: number, index: number): StepState => {
  if (currentIndex < 0) return "pending";
  if (index < currentIndex) return "done";
  if (index === currentIndex) return "active";
  return "pending";
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
  return (
    <View style={styles.wrap}>
      {steps.map((step, index) => {
        const stepState = stateFor(currentIndex, index);
        const isLast = index === steps.length - 1;
        const iconColor =
          stepState === "done" ? colors.success : stepState === "active" ? colors.primaryDark : colors.textMuted;
        const textColor =
          stepState === "done" ? colors.text : stepState === "active" ? colors.primaryDark : colors.textMuted;
        return (
          <View key={step.key} style={styles.row}>
            <View style={styles.nodeRow}>
              <View
                style={[
                  styles.node,
                  stepState === "active" && styles.nodeActive,
                  stepState === "done" && styles.nodeDone,
                  stepState === "pending" && styles.nodePending
                ]}
              >
                <Ionicons name={step.icon} size={iconSize.sm} color={iconColor} />
              </View>
              {!isLast ? (
                <View style={styles.track}>
                  <View
                    style={[
                      styles.trackFill,
                      (stepState === "done" || (stepState === "active" && currentIndex > index)) && styles.trackFillOn
                    ]}
                  />
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color: textColor }]}>{step.label}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs
  },
  row: {
    gap: spacing.xs
  },
  nodeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs
  },
  node: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1
  },
  nodeActive: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.primaryMuted
  },
  nodeDone: {
    borderColor: "rgba(15, 157, 90, 0.35)",
    backgroundColor: colors.successMuted
  },
  nodePending: {
    borderColor: colors.border,
    backgroundColor: colors.surface2
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.bgDeep,
    overflow: "hidden"
  },
  trackFill: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.bgDeep
  },
  trackFillOn: {
    backgroundColor: colors.primary
  },
  label: {
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "right"
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
