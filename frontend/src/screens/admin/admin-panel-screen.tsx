import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import { DashboardStatCard as AdminDashboardStatCard } from "@/features/admin/components/dashboard-stat-card";
import { QuickActionCard as AdminQuickActionCard } from "@/features/admin/components/quick-action-card";
import { AppButton, AppContainer, EmptyState, LoadingSkeleton } from "@/ui";
import { getAdminStats, getPendingTrucks, reviewTruck } from "@/features/admin/api";
import type { MainTabParamList } from "@/navigation/main-tabs";
import { getReadableNetworkError } from "@/api/network-error";
import { useAuthStore } from "@/store/auth-store";
import { colors, radius, shadows, spacing, typography } from "@/theme/tokens";
import { resolveMediaUrl } from "@/utils/media-url";

export const AdminPanelScreen = () => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken) ?? "";
  const fullName = useAuthStore((s) => s.user?.fullName) ?? "مدير النظام";
  const roleCode = useAuthStore((s) => s.user?.roleCode);
  const [selectedTruckId, setSelectedTruckId] = useState<number | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [rejectingTruckId, setRejectingTruckId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const pendingQuery = useQuery({
    queryKey: ["admin-pending-trucks", accessToken],
    queryFn: () => getPendingTrucks(accessToken),
    enabled: !!accessToken
  });
  const statsQuery = useQuery({
    queryKey: ["admin-dashboard-stats", accessToken],
    queryFn: () => getAdminStats(accessToken),
    enabled: !!accessToken
  });
  const selectedTruck = (pendingQuery.data ?? []).find((truck) => truck.id === selectedTruckId) ?? null;
  const pendingItems = pendingQuery.data ?? [];
  const totalPending = statsQuery.data?.pendingRequests ?? 0;

  const dashboardStats = useMemo(() => {
    const approvedCount = statsQuery.data?.approvedTrucks ?? 0;
    const rejectedCount = statsQuery.data?.rejectedTrucks ?? 0;
    const withDocuments = pendingItems.filter((truck) => Boolean(truck.document_url)).length;
    const withLocation = pendingItems.filter((truck) => truck.latitude !== null && truck.longitude !== null).length;
    const recent = statsQuery.data?.todayRequests ?? 0;
    return { approvedCount, rejectedCount, withDocuments, withLocation, recent };
  }, [pendingItems, statsQuery.data]);

  const getStatusLabel = (status: string) => {
    if (status === "pending") return "بانتظار المراجعة";
    if (status === "approved") return "مقبول";
    if (status === "rejected") return "مرفوض";
    return status;
  };

  const openExternalLink = async (url: string | null) => {
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) return;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  const openInMaps = async (latitude: number | null, longitude: number | null) => {
    if (latitude === null || longitude === null) return;
    const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
    const canOpen = await Linking.canOpenURL(mapsUrl);
    if (canOpen) {
      await Linking.openURL(mapsUrl);
    }
  };

  const reviewMutation = useMutation({
    mutationFn: ({ truckId, decision, reviewNote }: { truckId: number; decision: "approved" | "rejected"; reviewNote?: string }) =>
      reviewTruck(truckId, decision, accessToken, reviewNote),
    onSuccess: async () => {
      setRejectingTruckId(null);
      setRejectionReason("");
      await queryClient.invalidateQueries({ queryKey: ["admin-pending-trucks"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    }
  });

  if (!accessToken || roleCode !== "admin") {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.pad}>
          <Text style={styles.pageTitle}>لوحة الإدارة</Text>
          <Text style={styles.errorText}>هذه الصفحة مخصصة لحساب الإدارة فقط.</Text>
        </View>
      </AppContainer>
    );
  }

  if (pendingQuery.isLoading) {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.pad}>
          <Text style={styles.pageTitle}>لوحة الإدارة</Text>
          <LoadingSkeleton rows={7} />
        </View>
      </AppContainer>
    );
  }

  if (pendingQuery.isError) {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.pad}>
          <Text style={styles.pageTitle}>لوحة الإدارة</Text>
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{getReadableNetworkError(pendingQuery.error)}</Text>
            <AppButton label="إعادة المحاولة" onPress={() => void pendingQuery.refetch()} fullWidth />
          </View>
        </View>
      </AppContainer>
    );
  }

  return (
    <AppContainer edges={["top"]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={pendingQuery.isFetching || statsQuery.isFetching}
            onRefresh={() => {
              void pendingQuery.refetch();
              void statsQuery.refetch();
            }}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>الإدارة المركزية</Text>
          <Text style={styles.pageTitle}>لوحة الإدارة</Text>
          <Text style={styles.pageSub}>
            مرحبًا {fullName}، راجع طلبات التسجيل بسرعة، وتابع مؤشرات الاعتمادات، وافتح أقسام الإدارة من مكان واحد.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>المؤشرات الرئيسية</Text>
          <Text style={styles.sectionSub}>ملخص سريع للحالة الحالية بناءً على البيانات المتاحة الآن.</Text>
        </View>
        <View style={styles.statsGrid}>
          <AdminDashboardStatCard label="طلبات التسجيل المعلقة" value={totalPending} icon="time-outline" tone="warning" />
          <AdminDashboardStatCard label="التركات المعتمدة (متاح حاليًا)" value={dashboardStats.approvedCount} icon="checkmark-done-outline" tone="primary" />
          <AdminDashboardStatCard label="التركات المرفوضة (متاح حاليًا)" value={dashboardStats.rejectedCount} icon="close-circle-outline" tone="danger" />
          <AdminDashboardStatCard label="طلبات وصلت اليوم" value={dashboardStats.recent} icon="sparkles-outline" tone="neutral" />
          <AdminDashboardStatCard label="طلبات مع وثائق مرفقة" value={dashboardStats.withDocuments} icon="document-text-outline" tone="primary" />
          <AdminDashboardStatCard
            label="طلبات بإحداثيات موقع"
            value={dashboardStats.withLocation}
            icon="navigate-outline"
            tone="neutral"
            helper="يساعدك على سرعة التحقق من موقع الترك"
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>أقسام الإدارة</Text>
          <Text style={styles.sectionSub}>روابط واضحة للأعمال اليومية، مع إبقاء الأقسام غير المتاحة كـ placeholders منظمة.</Text>
        </View>
        <View style={styles.quickActionsGrid}>
          <AdminQuickActionCard
            title="مراجعة طلبات أصحاب التركات"
            description="فتح قائمة الطلبات المعلقة واعتمادها أو رفضها."
            icon="clipboard-outline"
            badge={`${totalPending} طلب`}
            onPress={() => scrollRef.current?.scrollTo({ y: 780, animated: true })}
          />
          <AdminQuickActionCard
            title="إدارة التراخيص"
            description="متابعة انتهاء الرخص والوثائق الرسمية."
            icon="document-lock-outline"
            badge="قريبًا"
            onPress={() => {}}
            disabled
          />
          <AdminQuickActionCard
            title="إدارة الإشعارات"
            description="إرسال تنبيهات إدارية ومتابعة التحديثات."
            icon="notifications-outline"
            badge="قريبًا"
            onPress={() => {}}
            disabled
          />
          <AdminQuickActionCard
            title="إدارة التصنيفات"
            description="تنظيم تصنيفات المنيو وإضافة/تعديل التصنيفات."
            icon="layers-outline"
            badge="قريبًا"
            onPress={() => {}}
            disabled
          />
          <AdminQuickActionCard
            title="إدارة حسابات الأدمن"
            description="توجّه إلى صفحة الحساب لإضافة أدمن جديد وإدارة بياناتك."
            icon="people-outline"
            onPress={() => navigation.navigate("Profile")}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>طلبات التسجيل المعلقة</Text>
          <Text style={styles.sectionSub}>راجع التفاصيل ثم اتخذ قرار القبول أو الرفض مع سبب واضح.</Text>
        </View>

        {pendingItems.length === 0 ? (
          <EmptyState
            variant="card"
            icon="checkmark-circle-outline"
            title="لا توجد طلبات معلقة حاليًا"
            description="عمل رائع. عند وصول طلبات جديدة ستظهر هنا مباشرة."
          />
        ) : null}

        {pendingItems.map((truck) => (
          <View key={truck.id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.requestTitleWrap}>
                <Text style={styles.requestTitle} numberOfLines={1}>
                  {truck.display_name}
                </Text>
                <Text style={styles.requestMeta}>رقم الرخصة: {truck.license_number}</Text>
              </View>
              <Pressable style={styles.detailsButton} onPress={() => setSelectedTruckId(truck.id)}>
                <Ionicons name="information-circle-outline" size={20} color={colors.primaryDark} />
              </Pressable>
            </View>
            <Text style={styles.requestState}>الحالة: {getStatusLabel(truck.approval_status)}</Text>
            <View style={styles.row}>
              <View style={styles.flexOne}>
                <AppButton
                  label="قبول"
                  onPress={() => reviewMutation.mutate({ truckId: truck.id, decision: "approved" })}
                  variant="primary"
                  fullWidth
                />
              </View>
              <View style={styles.flexOne}>
                <AppButton
                  label="رفض"
                  onPress={() => {
                    setRejectingTruckId(truck.id);
                    setRejectionReason("");
                  }}
                  variant="danger"
                  fullWidth
                />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={rejectingTruckId !== null} transparent animationType="fade" onRequestClose={() => setRejectingTruckId(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissArea} onPress={() => setRejectingTruckId(null)} />
          <KeyboardAvoidingView
            style={styles.rejectKeyboardAvoid}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={24}
          >
            <View style={styles.modalCard}>
              <Text style={styles.rejectModalTitle}>سبب رفض الطلب</Text>
              <Text style={styles.rejectModalSubtitle}>لازم تكتب سبب واضح عشان يظهر لصاحب الفود ترك.</Text>
              <TextInput
                style={styles.rejectInput}
                placeholder="اكتب سبب الرفض..."
                placeholderTextColor={colors.textMuted}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
              />
              <View style={styles.row}>
                <View style={styles.flexOne}>
                  <AppButton label="إلغاء" onPress={() => setRejectingTruckId(null)} variant="secondary" fullWidth />
                </View>
                <View style={styles.flexOne}>
                  <AppButton
                    label="تأكيد الرفض"
                    onPress={() => {
                      if (!rejectingTruckId) return;
                      reviewMutation.mutate({
                        truckId: rejectingTruckId,
                        decision: "rejected",
                        reviewNote: rejectionReason.trim()
                      });
                    }}
                    variant="danger"
                    fullWidth
                  />
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={Boolean(selectedTruck)} transparent animationType="slide" onRequestClose={() => setSelectedTruckId(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissArea} onPress={() => setSelectedTruckId(null)} />
          <View style={styles.detailsModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تفاصيل طلب التسجيل</Text>
              <Pressable onPress={() => setSelectedTruckId(null)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
            {selectedTruck ? (
              <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.detailsStack} showsVerticalScrollIndicator>
                <View style={styles.sectionCard}>
                  <Text style={styles.detailSectionTitle}>بيانات الترك</Text>
                  {resolveMediaUrl(selectedTruck.cover_image_url) ? (
                    <Pressable onPress={() => setPreviewImageUrl(resolveMediaUrl(selectedTruck.cover_image_url))}>
                      <Image source={{ uri: resolveMediaUrl(selectedTruck.cover_image_url) ?? "" }} style={styles.coverImage} resizeMode="cover" />
                    </Pressable>
                  ) : (
                    <View style={styles.emptyImage}>
                      <Ionicons name="image-outline" size={24} color="#8EA6CC" />
                      <Text style={styles.emptyImageText}>لا توجد صورة مرفقة</Text>
                    </View>
                  )}
                  <Text style={styles.detailLine}>اسم الترك: {selectedTruck.display_name}</Text>
                  <Text style={styles.detailLine}>التصنيف: {selectedTruck.category_name ?? "-"}</Text>
                  <Text style={styles.detailLine}>الوصف: {selectedTruck.description ?? "-"}</Text>
                  <Text style={styles.detailLine}>أوقات العمل: {selectedTruck.working_hours ?? "-"}</Text>
                  <Text style={styles.detailLine}>رقم التواصل: {selectedTruck.contact_phone ?? "-"}</Text>
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.detailSectionTitle}>بيانات صاحب الطلب</Text>
                  <Text style={styles.detailLine}>الاسم: {selectedTruck.owner_full_name ?? "-"}</Text>
                  <Text style={styles.detailLine}>الإيميل: {selectedTruck.owner_email ?? "-"}</Text>
                  <Text style={styles.detailLine}>الجوال: {selectedTruck.owner_phone ?? "-"}</Text>
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.detailSectionTitle}>الموقع</Text>
                  <Text style={styles.detailLine}>المدينة: {selectedTruck.city ?? "-"}</Text>
                  <Text style={styles.detailLine}>الحي: {selectedTruck.neighborhood ?? "-"}</Text>
                  <Text style={styles.detailLine}>
                    الإحداثيات:{" "}
                    {selectedTruck.latitude !== null && selectedTruck.longitude !== null
                      ? `${selectedTruck.latitude}, ${selectedTruck.longitude}`
                      : "-"}
                  </Text>
                  {selectedTruck.latitude !== null && selectedTruck.longitude !== null ? (
                    <>
                      <MapView
                        style={styles.mapPreview}
                        initialRegion={{
                          latitude: selectedTruck.latitude,
                          longitude: selectedTruck.longitude,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01
                        }}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        rotateEnabled={false}
                        pitchEnabled={false}
                      >
                        <Marker coordinate={{ latitude: selectedTruck.latitude, longitude: selectedTruck.longitude }} />
                      </MapView>
                      <Pressable style={styles.linkButton} onPress={() => openInMaps(selectedTruck.latitude, selectedTruck.longitude)}>
                        <Ionicons name="map-outline" size={16} color={colors.primaryDark} />
                        <Text style={styles.linkButtonText}>فتح الموقع في الخرائط</Text>
                      </Pressable>
                    </>
                  ) : null}
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.detailSectionTitle}>بيانات الرخصة</Text>
                  <Text style={styles.detailLine}>رقم الرخصة: {selectedTruck.license_number}</Text>
                  <Text style={styles.detailLine}>انتهاء الرخصة: {selectedTruck.expires_at ?? "-"}</Text>
                  <Pressable
                    style={[styles.linkButton, !selectedTruck.document_url && styles.linkButtonDisabled]}
                    onPress={() => openExternalLink(selectedTruck.document_url)}
                    disabled={!selectedTruck.document_url}
                  >
                    <Ionicons name="document-outline" size={16} color={colors.primaryDark} />
                    <Text style={styles.linkButtonText}>فتح ملف الرخصة</Text>
                  </Pressable>
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.detailSectionTitle}>حالة الطلب</Text>
                  <Text style={styles.detailLine}>الحالة: {getStatusLabel(selectedTruck.approval_status)}</Text>
                  <Text style={styles.detailLine}>تاريخ التقديم: {new Date(selectedTruck.created_at).toLocaleDateString("en-CA")}</Text>
                </View>
              </ScrollView>
            ) : null}
            {previewImageUrl ? (
              <View style={styles.inlineImagePreviewOverlay}>
                <Pressable style={styles.inlineImagePreviewDismissArea} onPress={() => setPreviewImageUrl(null)} />
                <View style={styles.inlineImagePreviewCard}>
                  <View style={styles.imagePreviewHeader}>
                    <Text style={styles.imagePreviewTitle}>معاينة الصورة</Text>
                    <Pressable onPress={() => setPreviewImageUrl(null)}>
                      <Ionicons name="close" size={22} color={colors.text} />
                    </Pressable>
                  </View>
                  <Image source={{ uri: resolveMediaUrl(previewImageUrl) ?? "" }} style={styles.imagePreview} resizeMode="contain" />
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </AppContainer>
  );
};

const styles = StyleSheet.create({
  pad: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120
  },
  heroCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.section,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.soft
  },
  heroEyebrow: {
    color: colors.primaryDark,
    fontWeight: "800",
    fontSize: typography.caption
  },
  pageTitle: {
    color: colors.brandBlue,
    letterSpacing: 0.2,
    fontSize: typography.h1,
    fontWeight: "800"
  },
  pageSub: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    lineHeight: 22,
    fontSize: typography.bodySm,
    textAlign: "right",
    writingDirection: "rtl"
  },
  sectionHeader: {
    marginBottom: spacing.sm,
    marginTop: spacing.md
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: "800",
    textAlign: "right"
  },
  sectionSub: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 19,
    textAlign: "right",
    writingDirection: "rtl"
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing.sm
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing.sm
  },
  requestCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    ...shadows.soft
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  },
  requestTitleWrap: {
    flex: 1
  },
  requestTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.h3,
    textAlign: "right"
  },
  requestMeta: {
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: typography.caption,
    textAlign: "right"
  },
  requestState: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "right"
  },
  detailsButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  row: {
    flexDirection: "row",
    gap: spacing.xs
  },
  flexOne: {
    flex: 1
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.bodySm,
    lineHeight: 22
  },
  errorBanner: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
    ...shadows.soft
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay
  },
  modalDismissArea: {
    flex: 1
  },
  detailsModalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    maxHeight: "82%"
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
    gap: spacing.sm
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  modalTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.h2
  },
  detailsScroll: {
    maxHeight: "100%"
  },
  detailsStack: {
    gap: spacing.sm,
    paddingBottom: spacing.md
  },
  sectionCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    padding: spacing.sm,
    gap: 6
  },
  detailSectionTitle: {
    color: colors.text,
    fontWeight: "800",
    textAlign: "right"
  },
  coverImage: {
    width: "100%",
    height: 150,
    borderRadius: radius.sm
  },
  emptyImage: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    backgroundColor: colors.section,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  emptyImageText: {
    color: colors.textMuted
  },
  mapPreview: {
    width: "100%",
    height: 160,
    borderRadius: radius.sm,
    marginTop: 4
  },
  detailLine: {
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl"
  },
  linkButton: {
    marginTop: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.section,
    paddingVertical: 9,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  linkButtonDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.surface2
  },
  linkButtonText: {
    color: colors.primaryDark,
    fontWeight: "700"
  },
  rejectKeyboardAvoid: {
    width: "100%"
  },
  rejectModalTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.h3
  },
  rejectModalSubtitle: {
    color: colors.textSecondary
  },
  rejectInput: {
    minHeight: 95,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
    textAlign: "right",
    writingDirection: "rtl"
  },
  inlineImagePreviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  inlineImagePreviewDismissArea: {
    ...StyleSheet.absoluteFillObject
  },
  inlineImagePreviewCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 10,
    maxHeight: "90%"
  },
  imagePreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  imagePreviewTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.body
  },
  imagePreview: {
    width: "100%",
    height: 420,
    borderRadius: radius.sm,
    backgroundColor: colors.section
  }
});
