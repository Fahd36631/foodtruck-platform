import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { AppButton, AppContainer, LoadingSkeleton } from "@/ui";
import type { OwnerNotificationItem } from "@/features/trucks/api";
import type { OwnerTruckSummary } from "@/features/trucks/api";
import { OwnerApprovalBadge } from "@/features/owner/components/owner-approval-badge";
import { OwnerEmptyState } from "@/features/owner/components/owner-empty-state";
import { OwnerPageHeader } from "@/features/owner/components/owner-page-header";
import { OWNER, ownerRadius, ownerShadow, ownerSpacing } from "@/features/owner/theme";
import type { RootStackParamList } from "@/navigation/root-stack";
import { getReadableNetworkError } from "@/api/network-error";
import { typography } from "@/theme/tokens";

type OwnerTruckGateProps = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  pageTitle: string;
  pageSubtitle: string;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  trucks: OwnerTruckSummary[];
  fullName?: string;
  latestNotification?: OwnerNotificationItem | null;
  setupDescription: string;
  pendingDescription: string;
  children: React.ReactNode;
};

export const OwnerTruckGate = ({
  navigation,
  pageTitle,
  pageSubtitle,
  isLoading,
  isError,
  error,
  onRetry,
  trucks,
  fullName,
  latestNotification,
  setupDescription,
  pendingDescription,
  children
}: OwnerTruckGateProps) => {
  if (isLoading) {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.pad}>
          <OwnerPageHeader title={pageTitle} subtitle={pageSubtitle} />
          <LoadingSkeleton rows={5} />
        </View>
      </AppContainer>
    );
  }

  if (isError) {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.pad}>
          <OwnerPageHeader title={pageTitle} subtitle={pageSubtitle} />
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={22} color={OWNER.danger} />
            <Text style={styles.errorText}>{getReadableNetworkError(error)}</Text>
            <AppButton label="إعادة المحاولة" onPress={onRetry} variant="primary" fullWidth />
          </View>
        </View>
      </AppContainer>
    );
  }

  const activeTruck = trucks[0];

  if (!activeTruck) {
    return (
      <AppContainer edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <OwnerPageHeader title={pageTitle} subtitle={pageSubtitle} />
          <OwnerEmptyState
            icon="storefront-outline"
            title="أكمل بيانات الترك"
            description={setupDescription}
            actionLabel="إكمال بيانات الترك"
            onAction={() => navigation.navigate("OwnerOnboarding", { flow: "register" })}
          />
        </ScrollView>
      </AppContainer>
    );
  }

  if (activeTruck.approval_status !== "approved") {
    const isPending = activeTruck.approval_status === "pending";
    return (
      <AppContainer edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <OwnerPageHeader
            eyebrow="حالة التسجيل"
            title={fullName ? `مرحبًا ${fullName}` : pageTitle}
            subtitle={pendingDescription}
          />

          {latestNotification ? (
            <View style={styles.noteCard}>
              <Ionicons name="notifications-outline" size={20} color={OWNER.orange} />
              <View style={styles.noteText}>
                <Text style={styles.noteTitle}>{latestNotification.title}</Text>
                <Text style={styles.noteBody}>{latestNotification.body}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.statusCard}>
            <OwnerApprovalBadge status={activeTruck.approval_status} />
            <Text style={styles.truckName}>{activeTruck.display_name}</Text>
            <Text style={styles.metaLine}>رقم التسجيل: #{activeTruck.id.toLocaleString("ar-SA")}</Text>
            <Text style={styles.metaLine}>
              تاريخ التقديم: {new Date(activeTruck.created_at).toLocaleDateString("ar-SA")}
            </Text>

            {!isPending && activeTruck.review_note?.trim() ? (
              <View style={styles.rejectBox}>
                <Text style={styles.rejectTitle}>سبب الرفض</Text>
                <Text style={styles.rejectBody}>{activeTruck.review_note.trim()}</Text>
              </View>
            ) : null}

            <AppButton label="تحديث الحالة" onPress={onRetry} variant="secondary" fullWidth />
            {!isPending ? (
              <AppButton
                label="تعديل البيانات وإعادة الإرسال"
                onPress={() => navigation.navigate("OwnerOnboarding", { flow: "update" })}
                variant="primary"
                fullWidth
              />
            ) : null}
          </View>
        </ScrollView>
      </AppContainer>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  pad: {
    flex: 1,
    paddingHorizontal: ownerSpacing.screenX,
    paddingTop: 12,
    paddingBottom: ownerSpacing.screenBottom,
    backgroundColor: OWNER.bg
  },
  scroll: {
    paddingHorizontal: ownerSpacing.screenX,
    paddingTop: 12,
    paddingBottom: ownerSpacing.screenBottom,
    backgroundColor: OWNER.bg
  },
  errorCard: {
    borderRadius: ownerRadius.card,
    borderWidth: 1,
    borderColor: OWNER.danger,
    backgroundColor: OWNER.dangerSoft,
    padding: 16,
    gap: 12,
    alignItems: "center",
    ...ownerShadow
  },
  errorText: {
    color: OWNER.danger,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 22,
    fontWeight: "700"
  },
  noteCard: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: ownerRadius.card,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 0, 0.22)",
    backgroundColor: OWNER.orangeLight,
    padding: 14,
    marginBottom: 12,
    ...ownerShadow
  },
  noteText: {
    flex: 1,
    alignItems: "flex-end"
  },
  noteTitle: {
    color: OWNER.text,
    fontWeight: "800",
    fontSize: typography.bodySm,
    textAlign: "right",
    writingDirection: "rtl"
  },
  noteBody: {
    marginTop: 4,
    color: OWNER.muted,
    fontSize: typography.caption,
    lineHeight: 19,
    textAlign: "right",
    writingDirection: "rtl"
  },
  statusCard: {
    borderRadius: ownerRadius.card,
    borderWidth: 1,
    borderColor: OWNER.border,
    backgroundColor: OWNER.white,
    padding: 16,
    gap: 10,
    ...ownerShadow
  },
  truckName: {
    color: OWNER.text,
    fontSize: typography.h2,
    fontWeight: "900",
    textAlign: "right",
    writingDirection: "rtl",
    alignSelf: "stretch"
  },
  metaLine: {
    color: OWNER.muted,
    fontSize: typography.caption,
    textAlign: "right",
    writingDirection: "rtl",
    alignSelf: "stretch"
  },
  rejectBox: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.2)",
    backgroundColor: OWNER.dangerSoft,
    padding: 12,
    gap: 4
  },
  rejectTitle: {
    color: OWNER.danger,
    fontWeight: "800",
    textAlign: "right",
    writingDirection: "rtl"
  },
  rejectBody: {
    color: OWNER.muted,
    lineHeight: 20,
    textAlign: "right",
    writingDirection: "rtl"
  }
});
