import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import { AdminMetricListModal } from "@/features/admin/components/admin-metric-list-modal";
import { DashboardStatCard as AdminDashboardStatCard } from "@/features/admin/components/dashboard-stat-card";
import { QuickActionCard as AdminQuickActionCard } from "@/features/admin/components/quick-action-card";
import { AppButton, AppContainer, LoadingSkeleton } from "@/ui";
import { getAdminStats, getPendingTrucks, reviewTruck, type AdminTruckListFilter, type PendingTruck } from "@/features/admin/api";
import type { MainTabParamList } from "@/navigation/main-tabs";
import { getReadableNetworkError } from "@/api/network-error";
import { useAuthStore } from "@/store/auth-store";
import { colors, radius, shadows, spacing, typography } from "@/theme/tokens";
import { resolveMediaUrl } from "@/utils/media-url";
import { formatLicenseExpiryForAdmin } from "@/utils/license-document-url";

export const AdminPanelScreen = () => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken) ?? "";
  const fullName = useAuthStore((s) => s.user?.fullName) ?? "مدير النظام";
  const roleCode = useAuthStore((s) => s.user?.roleCode);
  const [activeMetric, setActiveMetric] = useState<AdminTruckListFilter | null>(null);
  const [selectedTruck, setSelectedTruck] = useState<PendingTruck | null>(null);
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
  const pendingItems = pendingQuery.data ?? [];
  const adminStats = statsQuery.data;
  const totalPending = adminStats?.pendingRequests ?? pendingItems.length;
  const approvedCount = adminStats?.approvedTrucks ?? 0;
  const rejectedCount = adminStats?.rejectedTrucks ?? 0;
  const todayRequests = adminStats?.todayRequests ?? 0;
  const selectedLicenseFileUrl = selectedTruck?.license_file_url ?? selectedTruck?.document_url ?? null;

  /**
   * Normalize Cloudinary Raw PDF URLs without `.pdf` suffix (iOS treats them as generic data).
   * No WebView, no fl_attachment — only `Linking.openURL` on the final HTTPS URL.
   */
  const buildAdminLicenseOpenUrl = (truck: PendingTruck | null, licenseUrl: string): string => {
    const path = licenseUrl.split(/[?#]/)[0]?.toLowerCase() ?? "";
    if (!path.includes("/raw/upload/") || path.endsWith(".pdf")) {
      return licenseUrl;
    }

    const lastSeg = path.split("/").filter(Boolean).pop() ?? "";
    const hasKnownExt = /\.[a-z0-9]{2,12}$/i.test(lastSeg);
    const fmt = (truck?.license_file_format ?? "").toLowerCase();
    const isPdf = fmt === "pdf";

    if (isPdf || !hasKnownExt) {
      return `${licenseUrl}.pdf`;
    }

    return licenseUrl;
  };

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

  const copyLicenseUrl = async (licenseUrl: string) => {
    try {
      await Share.share({
        title: "رابط ملف الرخصة",
        message: licenseUrl,
        ...(Platform.OS === "ios" ? { url: licenseUrl } : {})
      });
    } catch {
      Alert.alert("تعذر فتح مشاركة الرابط، يرجى المحاولة لاحقًا");
    }
  };

  const showLicenseOpenFailedAlert = (linkToShare: string) => {
    Alert.alert(
      "تعذر فتح ملف الرخصة، يرجى المحاولة لاحقًا",
      "",
      [
        { text: "حسناً", style: "cancel" },
        {
          text: "نسخ أو مشاركة الرابط",
          onPress: () => {
            void Share.share({
              title: "رابط ملف الرخصة",
              message: linkToShare,
              ...(Platform.OS === "ios" ? { url: linkToShare } : {})
            }).catch(() => undefined);
          }
        }
      ],
      { cancelable: true }
    );
  };

  const openLicenseDocument = async (truck: PendingTruck | null) => {
    const licenseUrlUnclean =
      truck?.license_file_url?.trim() ?? truck?.document_url?.trim() ?? null;

    console.log("ADMIN_LICENSE_DEBUG", {
      license_file_url: truck?.license_file_url ?? null,
      license_file_resource_type: truck?.license_file_resource_type ?? null,
      license_file_format: truck?.license_file_format ?? null,
      license_file_public_id: truck?.license_file_public_id ?? null
    });

    if (!licenseUrlUnclean) {
      Alert.alert("لا يوجد ملف رخصة مرفوع");
      return;
    }

    const finalUrl = buildAdminLicenseOpenUrl(truck, licenseUrlUnclean);

    if (!/^https?:\/\//i.test(finalUrl)) {
      showLicenseOpenFailedAlert(finalUrl);
      return;
    }

    Alert.alert("رابط ملف الرخصة (النهائي)", finalUrl, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "فتح الملف",
        onPress: () => {
          void (async () => {
            try {
              const canOpen = await Linking.canOpenURL(finalUrl);
              if (!canOpen) {
                showLicenseOpenFailedAlert(finalUrl);
                return;
              }
              await Linking.openURL(finalUrl);
            } catch {
              showLicenseOpenFailedAlert(finalUrl);
            }
          })();
        }
      }
    ]);
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
      await queryClient.invalidateQueries({ queryKey: ["admin-trucks-by-filter"] });
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
            tintColor="#FF6B00"
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
          <AdminDashboardStatCard
            label="طلبات التسجيل المعلقة"
            value={totalPending}
            icon="time-outline"
            tone="warning"
            onPress={() => setActiveMetric("pending")}
          />
          <AdminDashboardStatCard
            label="التركات المعتمدة (متاح حاليًا)"
            value={approvedCount}
            icon="checkmark-done-outline"
            tone="primary"
            onPress={() => setActiveMetric("approved")}
          />
          <AdminDashboardStatCard
            label="التركات المرفوضة (متاح حاليًا)"
            value={rejectedCount}
            icon="close-circle-outline"
            tone="danger"
            onPress={() => setActiveMetric("rejected")}
          />
          <AdminDashboardStatCard
            label="طلبات وصلت اليوم"
            value={todayRequests}
            icon="sparkles-outline"
            tone="neutral"
            onPress={() => setActiveMetric("today")}
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
            onPress={() => setActiveMetric("pending")}
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
          <View style={styles.adminEmptyCard}>
            <View style={styles.adminEmptyIcon}>
              <Ionicons name="checkmark-circle-outline" size={28} color={ADMIN.orange} />
            </View>
            <Text style={styles.adminEmptyTitle}>لا توجد طلبات معلقة حاليًا</Text>
            <Text style={styles.adminEmptyDesc}>عمل رائع. عند وصول طلبات جديدة ستظهر هنا مباشرة.</Text>
          </View>
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
              <Pressable style={styles.detailsButton} onPress={() => setSelectedTruck(truck)}>
                <Ionicons name="information-circle-outline" size={20} color={ADMIN.orange} />
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

      <AdminMetricListModal
        visible={activeMetric !== null}
        filter={activeMetric}
        accessToken={accessToken}
        onClose={() => setActiveMetric(null)}
        onOpenDetails={(truck) => {
          setActiveMetric(null);
          setSelectedTruck(truck);
        }}
        onApprove={(truckId) => reviewMutation.mutate({ truckId, decision: "approved" })}
        onReject={(truckId) => {
          setActiveMetric(null);
          setRejectingTruckId(truckId);
          setRejectionReason("");
        }}
      />

      <Modal visible={Boolean(selectedTruck)} transparent animationType="slide" onRequestClose={() => setSelectedTruck(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissArea} onPress={() => setSelectedTruck(null)} />
          <View style={styles.detailsModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تفاصيل طلب التسجيل</Text>
              <Pressable onPress={() => setSelectedTruck(null)}>
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
                      <Ionicons name="image-outline" size={24} color={ADMIN.muted} />
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
                        <Ionicons name="map-outline" size={16} color={ADMIN.orange} />
                        <Text style={styles.linkButtonText}>فتح الموقع في الخرائط</Text>
                      </Pressable>
                    </>
                  ) : null}
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.detailSectionTitle}>بيانات الرخصة</Text>
                  <Text style={styles.detailLine}>رقم الرخصة: {selectedTruck.license_number}</Text>
                  <Text style={styles.detailLine}>انتهاء الرخصة: {formatLicenseExpiryForAdmin(selectedTruck.expires_at)}</Text>
                  {selectedLicenseFileUrl ? (
                    <View style={styles.licenseButtonsRow}>
                      <Pressable style={[styles.linkButton, styles.licenseButton]} onPress={() => void openLicenseDocument(selectedTruck)}>
                        <Ionicons name="document-outline" size={16} color={ADMIN.orange} />
                        <Text style={styles.linkButtonText}>فتح الرابط</Text>
                      </Pressable>
                      <Pressable style={[styles.linkButton, styles.licenseButton]} onPress={() => void copyLicenseUrl(selectedLicenseFileUrl)}>
                        <Ionicons name="copy-outline" size={16} color={ADMIN.orange} />
                        <Text style={styles.linkButtonText}>نسخ الرابط</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Text style={styles.detailMutedLine}>لا يوجد ملف رخصة مرفوع</Text>
                  )}
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

const ADMIN = {
  orange: "#FF6B00",
  orangeLight: "#FFF3EA",
  text: "#0F1B35",
  muted: "#64748B",
  border: "#E5EEF7",
  bg: "#F7FAFD",
  white: "#FFFFFF"
} as const;

const styles = StyleSheet.create({
  pad: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120,
    backgroundColor: ADMIN.bg
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120,
    backgroundColor: ADMIN.bg
  },
  heroCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ADMIN.border,
    backgroundColor: ADMIN.orangeLight,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.soft
  },
  heroEyebrow: {
    color: ADMIN.orange,
    fontWeight: "800",
    fontSize: typography.caption,
    textAlign: "right",
    writingDirection: "rtl"
  },
  pageTitle: {
    color: ADMIN.text,
    fontSize: typography.h1,
    fontWeight: "800",
    textAlign: "right",
    writingDirection: "rtl"
  },
  pageSub: {
    marginTop: spacing.xs,
    color: ADMIN.muted,
    lineHeight: 22,
    fontSize: typography.bodySm,
    textAlign: "right",
    writingDirection: "rtl"
  },
  sectionHeader: {
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    alignItems: "flex-end"
  },
  sectionTitle: {
    color: ADMIN.text,
    fontSize: typography.h2,
    fontWeight: "800",
    textAlign: "right",
    writingDirection: "rtl",
    alignSelf: "stretch"
  },
  sectionSub: {
    marginTop: 4,
    color: ADMIN.muted,
    fontSize: typography.caption,
    lineHeight: 19,
    textAlign: "right",
    writingDirection: "rtl",
    alignSelf: "stretch"
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
  adminEmptyCard: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    backgroundColor: ADMIN.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ADMIN.border,
    marginBottom: spacing.sm,
    ...shadows.soft
  },
  adminEmptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 0, 0.22)",
    backgroundColor: ADMIN.orangeLight,
    alignItems: "center",
    justifyContent: "center"
  },
  adminEmptyTitle: {
    color: ADMIN.text,
    fontSize: typography.h3,
    fontWeight: "800",
    textAlign: "center",
    writingDirection: "rtl"
  },
  adminEmptyDesc: {
    color: ADMIN.muted,
    fontSize: typography.bodySm,
    lineHeight: 22,
    textAlign: "center",
    writingDirection: "rtl"
  },
  requestCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ADMIN.border,
    backgroundColor: ADMIN.white,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    ...shadows.soft
  },
  requestHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  },
  requestTitleWrap: {
    flex: 1,
    alignItems: "flex-end"
  },
  requestTitle: {
    color: ADMIN.text,
    fontWeight: "800",
    fontSize: typography.h3,
    textAlign: "right",
    writingDirection: "rtl",
    alignSelf: "stretch"
  },
  requestMeta: {
    color: ADMIN.muted,
    marginTop: 4,
    fontSize: typography.caption,
    textAlign: "right",
    writingDirection: "rtl",
    alignSelf: "stretch"
  },
  requestState: {
    color: ADMIN.muted,
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "right",
    writingDirection: "rtl",
    alignSelf: "stretch"
  },
  detailsButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 0, 0.22)",
    backgroundColor: ADMIN.orangeLight,
    alignItems: "center",
    justifyContent: "center"
  },
  row: {
    flexDirection: "row-reverse",
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
    borderColor: ADMIN.border,
    backgroundColor: ADMIN.white,
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
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  modalTitle: {
    color: ADMIN.text,
    fontWeight: "800",
    fontSize: typography.h2,
    textAlign: "right",
    writingDirection: "rtl",
    flex: 1
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
    borderColor: ADMIN.border,
    backgroundColor: ADMIN.bg,
    padding: spacing.sm,
    gap: 6
  },
  detailSectionTitle: {
    color: ADMIN.text,
    fontWeight: "800",
    textAlign: "right",
    writingDirection: "rtl",
    alignSelf: "stretch"
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
    borderColor: ADMIN.border,
    backgroundColor: ADMIN.orangeLight,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  emptyImageText: {
    color: ADMIN.muted,
    textAlign: "right",
    writingDirection: "rtl"
  },
  mapPreview: {
    width: "100%",
    height: 160,
    borderRadius: radius.sm,
    marginTop: 4
  },
  detailLine: {
    color: ADMIN.muted,
    textAlign: "right",
    writingDirection: "rtl",
    alignSelf: "stretch",
    lineHeight: 21
  },
  detailMutedLine: {
    color: ADMIN.muted,
    textAlign: "right",
    writingDirection: "rtl",
    alignSelf: "stretch",
    fontSize: typography.caption
  },
  linkButton: {
    marginTop: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 0, 0.22)",
    backgroundColor: ADMIN.orangeLight,
    paddingVertical: 9,
    paddingHorizontal: 10,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  licenseButtonsRow: {
    flexDirection: "row-reverse",
    gap: spacing.xs
  },
  licenseButton: {
    flex: 1
  },
  linkButtonDisabled: {
    borderColor: ADMIN.border,
    backgroundColor: ADMIN.bg
  },
  linkButtonText: {
    color: ADMIN.orange,
    fontWeight: "700",
    textAlign: "right",
    writingDirection: "rtl"
  },
  rejectKeyboardAvoid: {
    width: "100%"
  },
  rejectModalTitle: {
    color: ADMIN.text,
    fontWeight: "800",
    fontSize: typography.h3,
    textAlign: "right",
    writingDirection: "rtl"
  },
  rejectModalSubtitle: {
    color: ADMIN.muted,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 21
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
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  imagePreviewTitle: {
    color: ADMIN.text,
    fontWeight: "800",
    fontSize: typography.body,
    textAlign: "right",
    writingDirection: "rtl"
  },
  imagePreview: {
    width: "100%",
    height: 420,
    borderRadius: radius.sm,
    backgroundColor: colors.section
  }
});
