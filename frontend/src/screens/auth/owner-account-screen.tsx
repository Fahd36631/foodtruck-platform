import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";

import { AppContainer } from "@/ui";
import { OwnerApprovalBadge } from "@/features/owner/components/owner-approval-badge";
import { OWNER, ownerRadius, ownerShadow, ownerSpacing } from "@/features/owner/theme";
import { getMyOwnerTruckDraft } from "@/features/trucks/api";
import type { RootStackParamList } from "@/navigation/root-stack";
import { useAuthStore } from "@/store/auth-store";
import { spacing, typography } from "@/theme/tokens";

const formatPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("966") && digits.length >= 12) {
    const local = digits.slice(3);
    return `+966 ${local.slice(0, 1)} ${local.slice(1, 4)} ${local.slice(4, 7)} ${local.slice(7)}`.trim();
  }
  return phone;
};

const truckStatusLabel = (status?: string | null) => {
  if (status === "pending") return "قيد المراجعة";
  if (status === "approved") return "معتمد";
  if (status === "rejected") return "مرفوض";
  return null;
};

export const OwnerAccountScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const accessToken = useAuthStore((s) => s.accessToken) ?? "";

  const draftQuery = useQuery({
    queryKey: ["owner-truck-draft", accessToken],
    queryFn: () => getMyOwnerTruckDraft(accessToken),
    enabled: !!accessToken
  });

  const draft = draftQuery.data;
  const approvalStatus =
    draft?.approval_status === "pending" || draft?.approval_status === "approved" || draft?.approval_status === "rejected"
      ? draft.approval_status
      : "none";

  const menuItems = [
    {
      title: "بيانات الترك",
      subtitle: draft?.display_name ? "تحديث بيانات الترك والرخصة" : "إكمال تسجيل الترك",
      icon: "storefront-outline" as const,
      onPress: () => navigation.navigate("OwnerOnboarding", { flow: draft ? "update" : "register" })
    },
    {
      title: "معلومات الحساب",
      subtitle: "تعديل بياناتك الشخصية وكلمة المرور",
      icon: "person-outline" as const,
      onPress: () => navigation.navigate("CustomerAccountEdit")
    },
    {
      title: "الخصوصية والأمان",
      subtitle: "إعدادات الأمان",
      icon: "shield-outline" as const,
      onPress: () =>
        navigation.navigate("ComingSoon", {
          title: "قريبًا",
          message: "سيتم توفير إعدادات الخصوصية والأمان لاحقًا."
        })
    },
    {
      title: "المساعدة والدعم",
      subtitle: "نحن هنا لمساعدتك",
      icon: "help-circle-outline" as const,
      onPress: () =>
        navigation.navigate("ComingSoon", {
          title: "قريبًا",
          message: "سيتم توفير مركز المساعدة والدعم لاحقًا."
        })
    }
  ];

  return (
    <AppContainer edges={["top"]}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["#FFB703", "#FF8533", "#FF6B00"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <Text style={styles.headerTitle}>الحساب</Text>
          <Text style={styles.headerSubtitle}>إدارة تركك وبياناتك الشخصية</Text>
        </LinearGradient>

        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.profileText}>
              <Text style={styles.profileName} numberOfLines={1}>
                {user?.fullName ?? "—"}
              </Text>
              <View style={styles.roleRow}>
                <Text style={styles.roleText}>صاحب ترك</Text>
                <Ionicons name="storefront" size={12} color={OWNER.orange} />
              </View>
              <Text style={styles.profileMeta} numberOfLines={1}>
                {user?.email ?? "—"}
              </Text>
              <Text style={styles.profileMeta} numberOfLines={1}>
                {user?.phone ? formatPhone(user.phone) : "—"}
              </Text>
            </View>
            <View style={styles.avatarWrap}>
              <Ionicons name="storefront" size={28} color={OWNER.orange} />
            </View>
          </View>

          {truckStatusLabel(draft?.approval_status) ? (
            <View style={styles.truckStatusRow}>
              <OwnerApprovalBadge status={approvalStatus} />
              <Text style={styles.truckStatusHint} numberOfLines={1}>
                {draft?.display_name ?? "لم يكتمل تسجيل الترك بعد"}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <Pressable
              key={item.title}
              style={[styles.menuRow, index < menuItems.length - 1 && styles.menuRowBorder]}
              onPress={item.onPress}
            >
              <Ionicons name="chevron-back" size={18} color={OWNER.muted} />
              <View style={styles.menuText}>
                <View style={styles.menuTitleRow}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <View style={styles.menuIcon}>
                    <Ionicons name={item.icon} size={16} color={OWNER.orange} />
                  </View>
                </View>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.logoutBtn} onPress={clearSession}>
          <Ionicons name="log-out-outline" size={18} color={OWNER.danger} />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </Pressable>
      </ScrollView>
    </AppContainer>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: OWNER.bg },
  content: { paddingBottom: 120 },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: 56,
    paddingHorizontal: ownerSpacing.screenX
  },
  headerTitle: {
    color: OWNER.white,
    fontSize: typography.h1,
    fontWeight: "900",
    textAlign: "right",
    writingDirection: "rtl"
  },
  headerSubtitle: {
    marginTop: 6,
    color: "rgba(255,255,255,0.92)",
    fontSize: typography.bodySm,
    textAlign: "right",
    writingDirection: "rtl"
  },
  profileCard: {
    marginTop: -36,
    marginHorizontal: ownerSpacing.screenX,
    borderRadius: ownerRadius.card,
    backgroundColor: OWNER.white,
    padding: ownerSpacing.card,
    gap: spacing.sm,
    ...ownerShadow
  },
  profileTop: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm
  },
  profileText: { flex: 1, alignItems: "flex-end" },
  profileName: {
    color: OWNER.text,
    fontSize: typography.h2,
    fontWeight: "900",
    textAlign: "right",
    writingDirection: "rtl"
  },
  roleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    marginTop: 4
  },
  roleText: {
    color: OWNER.orange,
    fontSize: typography.caption,
    fontWeight: "800",
    writingDirection: "rtl"
  },
  profileMeta: {
    marginTop: 3,
    color: OWNER.muted,
    fontSize: typography.caption,
    textAlign: "right",
    writingDirection: "rtl"
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: OWNER.orangeLight,
    alignItems: "center",
    justifyContent: "center"
  },
  truckStatusRow: {
    borderTopWidth: 1,
    borderTopColor: OWNER.border,
    paddingTop: spacing.sm,
    gap: 8,
    alignItems: "flex-end"
  },
  truckStatusHint: {
    color: OWNER.muted,
    fontSize: typography.caption,
    textAlign: "right",
    writingDirection: "rtl"
  },
  menuCard: {
    marginTop: spacing.md,
    marginHorizontal: ownerSpacing.screenX,
    borderRadius: ownerRadius.card,
    backgroundColor: OWNER.white,
    overflow: "hidden",
    ...ownerShadow
  },
  menuRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
    gap: spacing.sm
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: OWNER.border },
  menuText: { flex: 1, alignItems: "flex-end" },
  menuTitleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8
  },
  menuTitle: {
    color: OWNER.text,
    fontSize: typography.bodySm,
    fontWeight: "800",
    textAlign: "right",
    writingDirection: "rtl"
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: OWNER.orangeLight,
    alignItems: "center",
    justifyContent: "center"
  },
  menuSubtitle: {
    marginTop: 2,
    color: OWNER.muted,
    fontSize: typography.caption,
    textAlign: "right",
    writingDirection: "rtl"
  },
  logoutBtn: {
    marginTop: spacing.md,
    marginHorizontal: ownerSpacing.screenX,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: ownerRadius.card,
    backgroundColor: OWNER.dangerSoft,
    paddingVertical: 16
  },
  logoutText: {
    color: OWNER.danger,
    fontSize: typography.body,
    fontWeight: "800",
    writingDirection: "rtl"
  }
});
