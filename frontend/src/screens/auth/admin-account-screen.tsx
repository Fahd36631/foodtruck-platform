import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";

import { AppContainer } from "@/ui";
import { getAdminStats } from "@/features/admin/api";
import type { RootStackParamList } from "@/navigation/root-stack";
import { useAuthStore } from "@/store/auth-store";
import { spacing, typography } from "@/theme/tokens";

const ACC = {
  orange: "#FF6B00",
  text: "#0F1B35",
  muted: "#64748B",
  border: "#E5EEF7",
  bg: "#F7FAFD",
  white: "#FFFFFF",
  shadow: "rgba(15, 27, 53, 0.08)",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2"
} as const;

const formatPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("966") && digits.length >= 12) {
    const local = digits.slice(3);
    return `+966 ${local.slice(0, 1)} ${local.slice(1, 4)} ${local.slice(4, 7)} ${local.slice(7)}`.trim();
  }
  return phone;
};

export const AdminAccountScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const accessToken = useAuthStore((s) => s.accessToken) ?? "";

  const statsQuery = useQuery({
    queryKey: ["admin-dashboard-stats", accessToken],
    queryFn: () => getAdminStats(accessToken),
    enabled: !!accessToken
  });

  const pendingCount = statsQuery.data?.pendingRequests ?? 0;

  const stats = [{ icon: "time-outline" as const, label: "طلبات معلقة", value: pendingCount }];

  const menuItems = [
    {
      title: "معلومات الحساب",
      subtitle: "تعديل معلوماتك الشخصية",
      onPress: () => navigation.navigate("CustomerAccountEdit")
    },
    {
      title: "إنشاء حساب أدمن",
      subtitle: "إضافة مدير نظام جديد",
      onPress: () => navigation.navigate("AdminCreateAccount")
    },
    {
      title: "الخصوصية والأمان",
      subtitle: "إدارة خصوصية حسابك",
      onPress: () =>
        navigation.navigate("ComingSoon", {
          title: "قريبًا",
          message: "سيتم توفير إعدادات الخصوصية والأمان لاحقًا."
        })
    },
    {
      title: "المساعدة والدعم",
      subtitle: "نحن هنا لمساعدتك",
      onPress: () =>
        navigation.navigate("ComingSoon", {
          title: "قريبًا",
          message: "سيتم توفير مركز المساعدة والدعم لاحقًا."
        })
    },
    {
      title: "عن التطبيق",
      subtitle: "الإصدار 2.1.0",
      onPress: () =>
        navigation.navigate("ComingSoon", {
          title: "قريبًا",
          message: "سيتم توفير معلومات التطبيق لاحقًا."
        })
    }
  ];

  return (
    <AppContainer edges={["top"]}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["#FFB703", "#FF8533", "#FF6B00"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <Text style={styles.headerTitle}>الحساب</Text>
          <Text style={styles.headerSubtitle}>إدارة معلوماتك وتفضيلاتك</Text>
        </LinearGradient>

        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.profileText}>
              <Text style={styles.profileName} numberOfLines={1}>
                {user?.fullName ?? "—"}
              </Text>
              <Text style={styles.profilePhone} numberOfLines={1}>
                {user?.phone ? formatPhone(user.phone) : "—"}
              </Text>
              <Text style={styles.profileRole}>مدير النظام</Text>
            </View>
            <View style={styles.avatarWrap}>
              <Ionicons name="shield-checkmark" size={28} color={ACC.orange} />
            </View>
          </View>

          <View style={styles.statsRow}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.statCell}>
                <Ionicons name={stat.icon} size={18} color={ACC.orange} />
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statValue}>{stat.value.toLocaleString("ar-SA")}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <Pressable
              key={item.title}
              style={[styles.menuRow, index < menuItems.length - 1 && styles.menuRowBorder]}
              onPress={item.onPress}
            >
              <Ionicons name="chevron-back" size={18} color={ACC.muted} />
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.logoutBtn} onPress={clearSession}>
          <Ionicons name="log-out-outline" size={18} color={ACC.danger} />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </Pressable>
      </ScrollView>
    </AppContainer>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: ACC.bg
  },
  content: {
    paddingBottom: 120
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: 56,
    paddingHorizontal: spacing.lg
  },
  headerTitle: {
    color: ACC.white,
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
    marginHorizontal: spacing.lg,
    borderRadius: 18,
    backgroundColor: ACC.white,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: ACC.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4
  },
  profileTop: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  profileText: {
    flex: 1,
    alignItems: "flex-end"
  },
  profileName: {
    color: ACC.text,
    fontSize: typography.h2,
    fontWeight: "900",
    textAlign: "right",
    writingDirection: "rtl"
  },
  profilePhone: {
    marginTop: 4,
    color: ACC.muted,
    fontSize: typography.bodySm,
    fontWeight: "600",
    textAlign: "right",
    writingDirection: "rtl"
  },
  profileRole: {
    marginTop: 4,
    color: ACC.orange,
    fontSize: typography.caption,
    fontWeight: "800",
    textAlign: "right",
    writingDirection: "rtl"
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF4EB",
    alignItems: "center",
    justifyContent: "center"
  },
  statsRow: {
    flexDirection: "row-reverse",
    borderTopWidth: 1,
    borderTopColor: ACC.border,
    paddingTop: spacing.sm
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 4
  },
  statLabel: {
    color: ACC.muted,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    writingDirection: "rtl"
  },
  statValue: {
    color: ACC.orange,
    fontSize: typography.h3,
    fontWeight: "900"
  },
  menuCard: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    borderRadius: 18,
    backgroundColor: ACC.white,
    overflow: "hidden",
    shadowColor: ACC.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3
  },
  menuRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
    gap: spacing.sm
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: ACC.border
  },
  menuText: {
    flex: 1,
    alignItems: "flex-end"
  },
  menuTitle: {
    color: ACC.text,
    fontSize: typography.bodySm,
    fontWeight: "800",
    textAlign: "right",
    writingDirection: "rtl"
  },
  menuSubtitle: {
    marginTop: 2,
    color: ACC.muted,
    fontSize: typography.caption,
    textAlign: "right",
    writingDirection: "rtl"
  },
  logoutBtn: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    backgroundColor: ACC.dangerSoft,
    paddingVertical: 16
  },
  logoutText: {
    color: ACC.danger,
    fontSize: typography.body,
    fontWeight: "800",
    writingDirection: "rtl"
  }
});
