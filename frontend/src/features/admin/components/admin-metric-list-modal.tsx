import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/ui";
import { getAdminTrucksByFilter, type AdminTruckListFilter, type PendingTruck } from "@/features/admin/api";
import { getReadableNetworkError } from "@/api/network-error";
import { radius, shadows, spacing, typography } from "@/theme/tokens";

const ADMIN = {
  orange: "#FF6B00",
  orangeLight: "#FFF3EA",
  text: "#0F1B35",
  muted: "#64748B",
  border: "#E5EEF7",
  bg: "#F7FAFD",
  white: "#FFFFFF",
  danger: "#E63946",
  warning: "#8A5A00"
} as const;

export const ADMIN_METRIC_META: Record<
  AdminTruckListFilter,
  { title: string; subtitle: string; emptyTitle: string; emptyDesc: string; allowReview: boolean }
> = {
  pending: {
    title: "طلبات التسجيل المعلقة",
    subtitle: "راجع الطلبات واتخذ قرار القبول أو الرفض.",
    emptyTitle: "لا توجد طلبات معلقة",
    emptyDesc: "كل الطلبات تمت مراجعتها.",
    allowReview: true
  },
  approved: {
    title: "التركات المعتمدة",
    subtitle: "قائمة التركات المعتمدة والمتاحة حاليًا.",
    emptyTitle: "لا توجد تركات معتمدة",
    emptyDesc: "لم يتم اعتماد أي ترك بعد.",
    allowReview: false
  },
  rejected: {
    title: "التركات المرفوضة",
    subtitle: "قائمة الطلبات التي تم رفضها.",
    emptyTitle: "لا توجد تركات مرفوضة",
    emptyDesc: "لا يوجد أي طلب مرفوض حاليًا.",
    allowReview: false
  },
  today: {
    title: "طلبات وصلت اليوم",
    subtitle: "كل طلبات التسجيل التي وصلت اليوم.",
    emptyTitle: "لا توجد طلبات اليوم",
    emptyDesc: "لم تصل أي طلبات تسجيل جديدة اليوم.",
    allowReview: false
  }
};

const getStatusLabel = (status: string) => {
  if (status === "pending") return "بانتظار المراجعة";
  if (status === "approved") return "مقبول";
  if (status === "rejected") return "مرفوض";
  return status;
};

const getStatusTone = (status: string) => {
  if (status === "approved") return styles.statusApproved;
  if (status === "rejected") return styles.statusRejected;
  return styles.statusPending;
};

type AdminMetricListModalProps = {
  visible: boolean;
  filter: AdminTruckListFilter | null;
  accessToken: string;
  onClose: () => void;
  onOpenDetails: (truck: PendingTruck) => void;
  onReject: (truckId: number) => void;
  onApprove: (truckId: number) => void;
};

export const AdminMetricListModal = ({
  visible,
  filter,
  accessToken,
  onClose,
  onOpenDetails,
  onReject,
  onApprove
}: AdminMetricListModalProps) => {
  const insets = useSafeAreaInsets();
  const meta = filter ? ADMIN_METRIC_META[filter] : null;

  const trucksQuery = useQuery({
    queryKey: ["admin-trucks-by-filter", accessToken, filter],
    queryFn: () => getAdminTrucksByFilter(accessToken, filter!),
    enabled: visible && !!accessToken && !!filter
  });

  const trucks = trucksQuery.data ?? [];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={ADMIN.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{meta?.title ?? ""}</Text>
            <Text style={styles.headerSub}>{meta?.subtitle ?? ""}</Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{trucks.length.toLocaleString("ar-SA")}</Text>
          </View>
        </View>

        {trucksQuery.isLoading ? (
          <View style={styles.centerState}>
            <Text style={styles.centerStateText}>جاري التحميل...</Text>
          </View>
        ) : null}

        {trucksQuery.isError ? (
          <View style={styles.centerState}>
            <Text style={styles.centerStateText}>{getReadableNetworkError(trucksQuery.error)}</Text>
            <AppButton label="إعادة المحاولة" onPress={() => void trucksQuery.refetch()} variant="primary" />
          </View>
        ) : null}

        {!trucksQuery.isLoading && !trucksQuery.isError ? (
          <ScrollView
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={trucksQuery.isFetching} onRefresh={() => void trucksQuery.refetch()} tintColor={ADMIN.orange} />
            }
          >
            {trucks.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="file-tray-outline" size={26} color={ADMIN.orange} />
                </View>
                <Text style={styles.emptyTitle}>{meta?.emptyTitle}</Text>
                <Text style={styles.emptyDesc}>{meta?.emptyDesc}</Text>
              </View>
            ) : (
              trucks.map((truck) => (
                <View key={truck.id} style={styles.truckCard}>
                  <View style={styles.truckHead}>
                    <View style={styles.truckHeadText}>
                      <Text style={styles.truckName} numberOfLines={1}>
                        {truck.display_name}
                      </Text>
                      <Text style={styles.truckMeta}>رقم الرخصة: {truck.license_number}</Text>
                      <Text style={styles.truckMeta}>
                        {truck.owner_full_name ?? "—"} · {truck.city ?? "—"}
                      </Text>
                      <Text style={styles.truckDate}>
                        تاريخ التقديم: {new Date(truck.created_at).toLocaleDateString("ar-SA")}
                      </Text>
                    </View>
                    <Pressable style={styles.detailsBtn} onPress={() => onOpenDetails(truck)}>
                      <Ionicons name="information-circle-outline" size={20} color={ADMIN.orange} />
                    </Pressable>
                  </View>

                  <View style={[styles.statusPill, getStatusTone(truck.approval_status)]}>
                    <Text style={styles.statusPillText}>{getStatusLabel(truck.approval_status)}</Text>
                  </View>

                  {meta?.allowReview ? (
                    <View style={styles.actionsRow}>
                      <View style={styles.actionFlex}>
                        <AppButton label="قبول" onPress={() => onApprove(truck.id)} variant="primary" fullWidth />
                      </View>
                      <View style={styles.actionFlex}>
                        <AppButton label="رفض" onPress={() => onReject(truck.id)} variant="danger" fullWidth />
                      </View>
                    </View>
                  ) : (
                    <Pressable style={styles.viewDetailsRow} onPress={() => onOpenDetails(truck)}>
                      <Ionicons name="chevron-back" size={16} color={ADMIN.orange} />
                      <Text style={styles.viewDetailsText}>عرض التفاصيل</Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: ADMIN.bg
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN.border,
    backgroundColor: ADMIN.white
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ADMIN.border,
    backgroundColor: ADMIN.bg,
    alignItems: "center",
    justifyContent: "center"
  },
  headerText: {
    flex: 1,
    alignItems: "flex-end"
  },
  headerTitle: {
    color: ADMIN.text,
    fontSize: typography.h2,
    fontWeight: "900",
    textAlign: "right",
    writingDirection: "rtl"
  },
  headerSub: {
    marginTop: 4,
    color: ADMIN.muted,
    fontSize: typography.caption,
    lineHeight: 19,
    textAlign: "right",
    writingDirection: "rtl"
  },
  countPill: {
    minWidth: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: ADMIN.orangeLight,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 0, 0.25)",
    alignItems: "center",
    justifyContent: "center"
  },
  countText: {
    color: ADMIN.orange,
    fontWeight: "900",
    fontSize: typography.bodySm
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.sm
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md
  },
  centerStateText: {
    color: ADMIN.muted,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 22
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ADMIN.border,
    backgroundColor: ADMIN.white,
    gap: spacing.sm,
    ...shadows.soft
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ADMIN.orangeLight,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyTitle: {
    color: ADMIN.text,
    fontSize: typography.h3,
    fontWeight: "800",
    textAlign: "center",
    writingDirection: "rtl"
  },
  emptyDesc: {
    color: ADMIN.muted,
    fontSize: typography.bodySm,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 21
  },
  truckCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ADMIN.border,
    backgroundColor: ADMIN.white,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.soft
  },
  truckHead: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  truckHeadText: {
    flex: 1,
    alignItems: "flex-end"
  },
  truckName: {
    color: ADMIN.text,
    fontSize: typography.h3,
    fontWeight: "900",
    textAlign: "right",
    writingDirection: "rtl",
    alignSelf: "stretch"
  },
  truckMeta: {
    marginTop: 3,
    color: ADMIN.muted,
    fontSize: typography.caption,
    textAlign: "right",
    writingDirection: "rtl",
    alignSelf: "stretch"
  },
  truckDate: {
    marginTop: 4,
    color: ADMIN.muted,
    fontSize: typography.micro,
    textAlign: "right",
    writingDirection: "rtl",
    alignSelf: "stretch"
  },
  detailsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 0, 0.22)",
    backgroundColor: ADMIN.orangeLight,
    alignItems: "center",
    justifyContent: "center"
  },
  statusPill: {
    alignSelf: "flex-end",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1
  },
  statusPending: {
    backgroundColor: "rgba(255, 183, 3, 0.15)",
    borderColor: "rgba(255, 183, 3, 0.4)"
  },
  statusApproved: {
    backgroundColor: ADMIN.orangeLight,
    borderColor: "rgba(255, 107, 0, 0.28)"
  },
  statusRejected: {
    backgroundColor: "rgba(230, 57, 70, 0.1)",
    borderColor: "rgba(230, 57, 70, 0.3)"
  },
  statusPillText: {
    color: ADMIN.text,
    fontSize: typography.micro,
    fontWeight: "800",
    writingDirection: "rtl"
  },
  actionsRow: {
    flexDirection: "row-reverse",
    gap: spacing.xs
  },
  actionFlex: {
    flex: 1
  },
  viewDetailsRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4
  },
  viewDetailsText: {
    color: ADMIN.orange,
    fontWeight: "800",
    fontSize: typography.caption,
    writingDirection: "rtl"
  }
});
