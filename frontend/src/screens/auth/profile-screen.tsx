import { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery } from "@tanstack/react-query";

import { AppButton, AppContainer } from "@/ui";
import { AdminAccountScreen } from "@/screens/auth/admin-account-screen";
import { CustomerAccountScreen } from "@/screens/auth/customer-account-screen";
import { OwnerAccountScreen } from "@/screens/auth/owner-account-screen";
import { changeMyPassword, updateMyProfile } from "@/features/auth/api";
import { getMyOwnerTruckDraft } from "@/features/trucks/api";
import type { RootStackParamList } from "@/navigation/root-stack";
import { getReadableNetworkError } from "@/api/network-error";
import { useAuthStore } from "@/store/auth-store";
import { colors, iconSize, radius, shadows, spacing, typography } from "@/theme/tokens";

export const ProfileScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const accessToken = useAuthStore((s) => s.accessToken) ?? "";
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isAuthenticated = !!accessToken && !!user;
  const normalizedRoleCode = (user?.roleCode ?? "").trim().toLowerCase().replace(/[-\s]/g, "_");
  const isAdmin = isAuthenticated && normalizedRoleCode === "admin";
  const isCustomer = isAuthenticated && normalizedRoleCode === "customer";
  const isTruckOwner =
    isAuthenticated &&
    (normalizedRoleCode === "truck_owner" || normalizedRoleCode === "truckowner" || normalizedRoleCode === "owner");
  const canEditProfile = isCustomer || isTruckOwner || isAdmin;

  const ownerTruckDraftQuery = useQuery({
    queryKey: ["owner-truck-draft", accessToken],
    queryFn: () => getMyOwnerTruckDraft(accessToken),
    enabled: !!accessToken && isTruckOwner
  });

  const draft = ownerTruckDraftQuery.data;
  const truckStatusLabel =
    draft?.approval_status === "pending"
      ? "قيد المراجعة"
      : draft?.approval_status === "rejected"
        ? "يحتاج تعديل"
        : draft?.approval_status === "approved"
          ? "معتمد"
          : null;

  useEffect(() => {
    setFullName(user?.fullName ?? "");
    setEmail(user?.email ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.fullName, user?.email, user?.phone]);

  const canSaveProfile = useMemo(() => {
    if (!user) return false;
    if (!fullName.trim() || !email.trim() || !phone.trim()) return false;
    return fullName.trim() !== user.fullName || email.trim() !== user.email || phone.trim() !== user.phone;
  }, [email, fullName, phone, user]);

  const profileErrors = useMemo(() => {
    const e: string[] = [];
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.push("صيغة البريد غير صحيحة");
    if (phone.trim() && phone.trim().length < 8) e.push("رقم الجوال قصير جدًا");
    return e;
  }, [email, phone]);

  const updateProfileMutation = useMutation({
    mutationFn: () =>
      updateMyProfile(
        {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim()
        },
        accessToken
      ),
    onSuccess: (updatedUser) => {
      if (!user || !accessToken) return;
      setSession({
        accessToken,
        user: {
          id: updatedUser.id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          phone: updatedUser.phone,
          roleCode: updatedUser.roleCode
        }
      });
      setErrorMessage("");
    },
    onError: (error) => {
      setErrorMessage(getReadableNetworkError(error));
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      changeMyPassword(
        {
          currentPassword,
          newPassword
        },
        accessToken
      ),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setErrorMessage("");
    },
    onError: (error) => {
      setErrorMessage(getReadableNetworkError(error));
    }
  });

  const isBusy = updateProfileMutation.isPending || changePasswordMutation.isPending;

  const roleMeta = isAdmin
    ? { label: "مدير النظام", icon: "shield-checkmark" as const }
    : isTruckOwner
      ? { label: "صاحب ترك", icon: "storefront" as const }
      : isCustomer
        ? { label: "عميل", icon: "person" as const }
        : null;

  if (isCustomer && user) {
    return <CustomerAccountScreen />;
  }

  if (isAdmin && user) {
    return <AdminAccountScreen />;
  }

  if (isTruckOwner && user) {
    return <OwnerAccountScreen />;
  }

  if (!user) {
    return (
      <GuestProfileWelcome
        onLogin={() => navigation.navigate("Auth", { initialMode: "login" })}
        onRegister={() => navigation.navigate("Auth", { initialMode: "register" })}
      />
    );
  }

  return (
    <AppContainer edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ProfileHero
          name={user.fullName}
          subtitle={user.email}
          phone={user.phone}
          roleMeta={roleMeta}
          isGuest={false}
        />

        {isTruckOwner ? (
          <SectionCard icon="storefront-outline" title="بيانات الترك">
            <View style={styles.truckHead}>
              {draft?.display_name ? (
                <Text style={styles.truckName} numberOfLines={1}>
                  {draft.display_name}
                </Text>
              ) : (
                <Text style={styles.truckNameMuted}>أكمل أو حدّث بيانات الترك</Text>
              )}
              {truckStatusLabel ? (
                <View
                  style={[
                    styles.statusPill,
                    draft?.approval_status === "pending"
                      ? styles.statusPending
                      : draft?.approval_status === "approved"
                        ? styles.statusApproved
                        : styles.statusRejected
                  ]}
                >
                  <Text style={styles.statusPillText}>{truckStatusLabel}</Text>
                </View>
              ) : null}
            </View>
            {draft?.approval_status === "pending" ? (
              <Text style={styles.truckPendingNotice}>
                يوجد طلب تحديث قيد المراجعة حاليًا. يمكنك متابعة الحالة من هذا القسم.
              </Text>
            ) : null}
            <Text style={styles.truckHint}>
              عند الحفظ يُرسل طلب تحديث للإدارة ولا يُعتمد مباشرة للزبائن قبل الموافقة.
            </Text>
            <AppButton
              label="تحديث بيانات الترك"
              icon="create-outline"
              onPress={() => navigation.navigate("OwnerOnboarding", { flow: draft ? "update" : "register" })}
              variant="primary"
              size="lg"
              fullWidth
            />
          </SectionCard>
        ) : null}

        {canEditProfile ? (
          <>
            <SectionCard icon="person-circle-outline" title="البيانات الشخصية">
              <FormField label="الاسم" icon="person-outline">
                <TextInput
                  style={styles.input}
                  placeholder="أدخل اسمك"
                  placeholderTextColor={colors.textMuted}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </FormField>
              <FormField label="البريد الإلكتروني" icon="mail-outline">
                <TextInput
                  style={styles.input}
                  placeholder="example@mail.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </FormField>
              <FormField label="رقم الجوال" icon="call-outline">
                <TextInput
                  style={styles.input}
                  placeholder="+9665xxxxxxxx"
                  placeholderTextColor={colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </FormField>
              {profileErrors.map((msg) => (
                <Text key={msg} style={styles.fieldError}>
                  {msg}
                </Text>
              ))}
              <AppButton
                label="حفظ التعديلات"
                icon="save-outline"
                variant="primary"
                onPress={() => {
                  setErrorMessage("");
                  updateProfileMutation.mutate();
                }}
                disabled={!canSaveProfile || isBusy || profileErrors.length > 0}
                loading={updateProfileMutation.isPending}
                fullWidth
              />
            </SectionCard>

            <SectionCard icon="lock-closed-outline" title="كلمة المرور">
              <FormField label="كلمة المرور الحالية" icon="key-outline">
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
              </FormField>
              <FormField label="كلمة المرور الجديدة" icon="shield-outline">
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
              </FormField>
              {newPassword.length > 0 && newPassword.length < 6 ? (
                <Text style={styles.fieldError}>ستة أحرف على الأقل للكلمة الجديدة</Text>
              ) : null}
              <AppButton
                label="تحديث كلمة المرور"
                icon="refresh-outline"
                variant="secondary"
                onPress={() => {
                  setErrorMessage("");
                  changePasswordMutation.mutate();
                }}
                disabled={isBusy || !currentPassword || !newPassword || newPassword.length < 6}
                loading={changePasswordMutation.isPending}
                fullWidth
              />
            </SectionCard>

          </>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={iconSize.md} color={colors.danger} />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        {user ? (
          <AppButton label="تسجيل الخروج" icon="log-out-outline" onPress={clearSession} variant="danger" fullWidth />
        ) : null}
      </ScrollView>
    </AppContainer>
  );
};

// ============================================================
// Profile Hero (avatar + name + role + contact)
// ============================================================

type RoleMeta = { label: string; icon: keyof typeof Ionicons.glyphMap } | null;

const ProfileHero = ({
  name,
  subtitle,
  phone,
  roleMeta,
  isGuest
}: {
  name: string;
  subtitle: string;
  phone?: string;
  roleMeta: RoleMeta;
  isGuest: boolean;
}) => (
  <View style={hero.wrap}>
    <LinearGradient
      colors={
        (isGuest
          ? ["#FFB703", "#FF8A2B", "#FF6B00"]
          : ["#FF8A2B", "#FF6B00", "#E55A00"]) as readonly [string, string, string]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={hero.avatarRing}
    >
      <View style={hero.avatarInner}>
        <Ionicons
          name={isGuest ? "person" : roleMeta?.icon ?? "person"}
          size={36}
          color={colors.primary}
        />
      </View>
    </LinearGradient>

    <Text style={hero.name} numberOfLines={1}>{name}</Text>

    {roleMeta && !isGuest ? (
      <View style={hero.rolePill}>
        <Ionicons name={roleMeta.icon} size={12} color={colors.primaryDark} />
        <Text style={hero.rolePillText}>{roleMeta.label}</Text>
      </View>
    ) : null}

    <View style={hero.metaList}>
      <View style={hero.metaRow}>
        <Ionicons name={isGuest ? "sparkles-outline" : "mail-outline"} size={14} color={colors.textMuted} />
        <Text style={hero.metaText}>{subtitle}</Text>
      </View>
      {phone ? (
        <View style={hero.metaRow}>
          <Ionicons name="call-outline" size={14} color={colors.textMuted} />
          <Text style={hero.metaText}>{phone}</Text>
        </View>
      ) : null}
    </View>
  </View>
);

const hero = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    ...shadows.soft
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    ...shadows.cta
  },
  avatarInner: {
    width: "100%",
    height: "100%",
    borderRadius: 44,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  name: {
    marginTop: spacing.md,
    color: colors.text,
    fontSize: typography.h1,
    fontWeight: "800",
    textAlign: "center"
  },
  rolePill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    marginTop: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong
  },
  rolePillText: {
    color: colors.primaryDark,
    fontSize: typography.micro,
    fontWeight: "800"
  },
  metaList: {
    marginTop: spacing.sm,
    gap: 4,
    alignItems: "center"
  },
  metaRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6
  },
  metaText: {
    color: colors.textMuted,
    fontSize: typography.bodySm,
    textAlign: "center"
  }
});

// ============================================================
// Guest welcome (not logged in)
// ============================================================

const GUEST_TRUCK_IMAGE = require("../../assets/images/backg2.png");

const GUEST_PERKS = [
  { icon: "time-outline" as const, text: "تتبع طلباتك لحظة بلحظة" },
  { icon: "heart-outline" as const, text: "احفظ تركاتك المفضلة" },
  { icon: "star-outline" as const, text: "قيم تجربتك بعد الاستلام" }
] as const;

const GuestProfileWelcome = ({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) => (
  <AppContainer edges={["top"]}>
    <ScrollView style={guestStyles.screen} contentContainerStyle={guestStyles.content} showsVerticalScrollIndicator={false}>
      <View style={guestStyles.heroSection}>
        <View style={guestStyles.heroVisual} pointerEvents="none">
          <View style={guestStyles.heroBlobPrimary} />
          <View style={guestStyles.heroBlobSecondary} />
          <Image source={GUEST_TRUCK_IMAGE} style={guestStyles.heroImage} resizeMode="contain" />
        </View>
        <View style={guestStyles.welcomeText}>
          <Text style={guestStyles.welcomeLine}>مرحبًا بك في</Text>
          <Text style={guestStyles.brandLine}>عالم التركات</Text>
          <View style={guestStyles.brandUnderline} />
          <Text style={guestStyles.welcomeDesc}>اكتشف ألذ الأكل من</Text>
          <Text style={guestStyles.welcomeDescSecond}>التركات القريبة منك</Text>
        </View>
      </View>

      <View style={guestStyles.card}>
        <View style={guestStyles.cardHead}>
          <View style={guestStyles.cardHeadIcon}>
            <Ionicons name="log-in-outline" size={18} color={GUEST.orange} />
          </View>
          <View style={guestStyles.cardHeadText}>
            <Text style={guestStyles.cardTitle}>ابدأ تجربتك الآن</Text>
            <View style={guestStyles.cardTitleAccent} />
            <Text style={guestStyles.cardBody}>
              أنشئ حسابًا لمتابعة طلباتك وحفظ تفضيلاتك، أو سجّل الدخول إن كان لديك حساب بالفعل.
            </Text>
          </View>
        </View>

        <View style={guestStyles.perksBlock}>
          {GUEST_PERKS.map((perk) => (
            <View key={perk.text} style={guestStyles.perkRow}>
              <View style={guestStyles.perkIcon}>
                <Ionicons name={perk.icon} size={16} color={GUEST.orange} />
              </View>
              <Text style={guestStyles.perkText}>{perk.text}</Text>
            </View>
          ))}
        </View>

        <AppButton label="تسجيل الدخول" icon="log-in-outline" onPress={onLogin} variant="primary" size="lg" fullWidth />
        <AppButton label="إنشاء حساب جديد" icon="person-add-outline" onPress={onRegister} variant="secondary" fullWidth />
      </View>
    </ScrollView>
  </AppContainer>
);

const GUEST = {
  orange: "#FF6B00",
  text: "#0F1B35",
  muted: "#64748B",
  border: "#E5EEF7",
  bg: "#F7FAFD",
  white: "#FFFFFF",
  shadow: "rgba(15, 27, 53, 0.08)",
  perkBg: "#FFF8F2"
} as const;

const guestStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: GUEST.bg
  },
  content: {
    paddingBottom: 120
  },
  heroSection: {
    height: 318,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    overflow: "visible",
    justifyContent: "flex-end"
  },
  heroVisual: {
    position: "absolute",
    top: -5,
    right: -32,
    width: 310,
    height: 248,
    zIndex: 1
  },
  heroBlobPrimary: {
    position: "absolute",
    top: -10,
    right: -48,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(255, 107, 0, 0.2)"
  },
  heroBlobSecondary: {
    position: "absolute",
    top: 12,
    right: 28,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 183, 3, 0.14)"
  },
  heroImage: {
    width: "100%",
    height: "140%"
  },
  welcomeText: {
    position: "absolute",
    left: -30,
    bottom: 2,
    width: "55%",
    maxWidth: 228,
    zIndex: 3,
    alignItems: "flex-end"
  },
  welcomeLine: {
    color: GUEST.text,
    fontSize: typography.h2,
    fontWeight: "800",
    textAlign: "right",
    width: "100%"
  },
  brandLine: {
    color: GUEST.orange,
    fontSize: typography.h1,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 2,
    width: "100%"
  },
  brandUnderline: {
    alignSelf: "flex-end",
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: GUEST.orange,
    marginTop: 6,
    opacity: 0.85
  },
  welcomeDesc: {
    marginTop: spacing.sm,
    color: GUEST.muted,
    fontSize: typography.bodySm,
    lineHeight: 22,
    textAlign: "right",
    fontWeight: "600",
    width: "100%"
  },
  welcomeDescSecond: {
    marginTop: 2,
    color: GUEST.muted,
    fontSize: typography.bodySm,
    lineHeight: 22,
    textAlign: "right",
    fontWeight: "600",
    width: "100%"
  },
  card: {
    marginTop: spacing.xs,
    marginHorizontal: spacing.lg,
    borderRadius: 20,
    backgroundColor: GUEST.white,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: GUEST.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 4
  },
  cardHead: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  cardHeadIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: GUEST.perkBg,
    alignItems: "center",
    justifyContent: "center"
  },
  cardHeadText: {
    flex: 1,
    alignItems: "flex-end"
  },
  cardTitle: {
    color: GUEST.text,
    fontSize: typography.h2,
    fontWeight: "900",
    textAlign: "right"
  },
  cardTitleAccent: {
    alignSelf: "flex-end",
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: GUEST.orange,
    marginTop: 6,
    marginBottom: 8
  },
  cardBody: {
    color: GUEST.muted,
    fontSize: typography.bodySm,
    lineHeight: 22,
    textAlign: "right"
  },
  perksBlock: {
    gap: spacing.sm
  },
  perkRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: 14,
    backgroundColor: GUEST.perkBg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12
  },
  perkIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: GUEST.white,
    alignItems: "center",
    justifyContent: "center"
  },
  perkText: {
    flex: 1,
    color: GUEST.text,
    fontSize: typography.bodySm,
    fontWeight: "700",
    textAlign: "right"
  }
});

// ============================================================
// Section Card (reusable card with icon + title)
// ============================================================

const SectionCard = ({
  icon,
  title,
  children
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
}) => (
  <View style={section.card}>
    <View style={section.header}>
      <View style={section.iconWrap}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={section.title}>{title}</Text>
    </View>
    {children}
  </View>
);

const section = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
    ...shadows.soft
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 4
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.h3,
    textAlign: "right"
  }
});

// ============================================================
// Form Field (label + icon + input container)
// ============================================================

const FormField = ({
  label,
  icon,
  children
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) => (
  <View style={field.wrap}>
    <Text style={field.label}>{label}</Text>
    <View style={field.inputBox}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <View style={field.inputSlot}>{children}</View>
    </View>
  </View>
);

const field = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: "800",
    textAlign: "right"
  },
  inputBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    minHeight: 46
  },
  inputSlot: { flex: 1 }
});

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120
  },

  // Truck owner section
  truckHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs
  },
  truckName: {
    flex: 1,
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.body,
    textAlign: "right"
  },
  truckNameMuted: {
    flex: 1,
    color: colors.textMuted,
    fontSize: typography.bodySm,
    textAlign: "right"
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1
  },
  statusPillText: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.micro
  },
  statusPending: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning
  },
  statusApproved: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.borderStrong
  },
  statusRejected: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger
  },
  truckPendingNotice: {
    color: colors.warning,
    fontSize: typography.caption,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "right"
  },
  truckHint: {
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    lineHeight: 21,
    textAlign: "right"
  },

  // Inputs
  input: {
    flex: 1,
    color: colors.text,
    fontSize: typography.bodySm,
    paddingVertical: 10,
    textAlign: "right",
    writingDirection: "rtl"
  },
  fieldError: {
    color: colors.danger,
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "right"
  },

  // Error banner
  errorBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
    marginBottom: spacing.sm
  },
  errorBannerText: {
    flex: 1,
    color: colors.danger,
    fontWeight: "700",
    fontSize: typography.bodySm,
    textAlign: "right"
  }
});
