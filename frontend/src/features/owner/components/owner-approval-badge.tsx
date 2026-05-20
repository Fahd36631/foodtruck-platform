import { StyleSheet, Text, View } from "react-native";

import { OWNER, ownerRadius } from "@/features/owner/theme";
import { typography } from "@/theme/tokens";

export type OwnerApprovalStatus = "pending" | "approved" | "rejected" | "none";

const labelByStatus: Record<OwnerApprovalStatus, string> = {
  pending: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
  none: "غير مسجل"
};

const toneByStatus = {
  pending: { bg: OWNER.warningSoft, border: "rgba(255, 183, 3, 0.45)", fg: OWNER.warning },
  approved: { bg: OWNER.orangeLight, border: "rgba(255, 107, 0, 0.28)", fg: OWNER.orange },
  rejected: { bg: OWNER.dangerSoft, border: "rgba(220, 38, 38, 0.25)", fg: OWNER.danger },
  none: { bg: OWNER.bg, border: OWNER.border, fg: OWNER.muted }
} as const;

export const OwnerApprovalBadge = ({ status }: { status: OwnerApprovalStatus }) => {
  const tone = toneByStatus[status];
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <Text style={[styles.text, { color: tone.fg }]}>{labelByStatus[status]}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-end",
    borderRadius: ownerRadius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  text: {
    fontSize: typography.caption,
    fontWeight: "800",
    writingDirection: "rtl"
  }
});
