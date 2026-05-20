import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery } from "@tanstack/react-query";

import { AppButton, AppContainer } from "@/ui";
import { createAdminAccount } from "@/features/admin/api";
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
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
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

  const createAdminMutation = useMutation({
    mutationFn: () =>
      createAdminAccount(
        {
          fullName: adminFullName.trim(),
          email: adminEmail.trim(),
          phone: adminPhone.trim(),
          password: adminPassword
        },
        accessToken
      ),
    onSuccess: () => {
      setAdminFullName("");
      setAdminEmail("");
      setAdminPhone("");
      setAdminPassword("");
      setErrorMessage("");
    },
    onError: (error) => {
      setErrorMessage(getReadableNetworkError(error));
    }
  });

  const isBusy = updateProfileMutation.isPending || changePasswordMutation.isPending || createAdminMutation.isPending;

  const roleMeta = isAdmin
    ? { label: "مدير النظام", icon: "shield-checkmark" as const }
    : isTruckOwner
      ? { label: "صاحب ترك", icon: "storefront" as const }
      : isCustomer
        ? { label: "عميل", icon: "person" as const }
        : null;

  return (
    <AppContainer edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ProfileHero
          name={user?.fullName ?? "أهلاً بك 👋"}
          subtitle={user?.email ?? "اكتشف أفضل عربات الطعام حولك"}
          phone={user?.phone}
          roleMeta={roleMeta}
          isGuest={!user}
        />

        {!user ? (
          <GuestAuthCard
            onLogin={() => navigation.navigate("Auth", { initialMode: "login" })}
            onRegister={() => navigation.navigate("Auth", { initialMode: "register" })}
          />
        ) : null}

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

            {isAdmin ? (
              <SectionCard icon="shield-checkmark-outline" title="إضافة حساب أدمن">
                <FormField label="الاسم الكامل" icon="person-outline">
                  <TextInput
                    style={styles.input}
                    placeholder="اسم الأدمن الجديد"
                    placeholderTextColor={colors.textMuted}
                    value={adminFullName}
                    onChangeText={setAdminFullName}
                  />
                </FormField>
                <FormField label="البريد الإلكتروني" icon="mail-outline">
                  <TextInput
                    style={styles.input}
                    placeholder="admin@mail.com"
                    placeholderTextColor={colors.textMuted}
                    value={adminEmail}
                    onChangeText={setAdminEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </FormField>
                <FormField label="رقم الجوال" icon="call-outline">
                  <TextInput
                    style={styles.input}
                    placeholder="+9665xxxxxxxx"
                    placeholderTextColor={colors.textMuted}
                    value={adminPhone}
                    onChangeText={setAdminPhone}
                    keyboardType="phone-pad"
                  />
                </FormField>
                <FormField label="كلمة المرور" icon="lock-closed-outline">
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textMuted}
                    value={adminPassword}
                    onChangeText={setAdminPassword}
                    secureTextEntry
                  />
                </FormField>
                <AppButton
                  label="إنشاء حساب أدمن"
                  icon="add-outline"
                  variant="primary"
                  onPress={() => {
                    setErrorMessage("");
                    createAdminMutation.mutate();
                  }}
                  disabled={
                    isBusy || !adminFullName.trim() || !adminEmail.trim() || !adminPhone.trim() || !adminPassword
                  }
                  loading={createAdminMutation.isPending}
                  fullWidth
                />
              </SectionCard>
            ) : null}
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
// Guest Auth Card
// ============================================================

const AUTH_PERKS = [
  { icon: "time-outline" as const, text: "تتبّع طلباتك لحظة بلحظة" },
  { icon: "heart-outline" as const, text: "احفظ تركاتك المفضّلة" },
  { icon: "star-outline" as const, text: "قيّم تجربتك بعد الاستلام" }
];

const GuestAuthCard = ({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) => (
  <View style={auth.wrap}>
    <View style={auth.header}>
      <View style={auth.iconRing}>
        <Ionicons name="log-in-outline" size={22} color={colors.primary} />
      </View>
      <View style={auth.headerText}>
        <Text style={auth.title}>ابدأ تجربتك</Text>
        <Text style={auth.body}>
          أنشئ حسابًا لمتابعة الطلبات وحفظ تفضيلاتك، أو سجّل الدخول إن كان لديك حساب بالفعل.
        </Text>
      </View>
    </View>

    <View style={auth.perksBlock}>
      {AUTH_PERKS.map((perk) => (
        <View key={perk.text} style={auth.perkRow}>
          <View style={auth.perkIcon}>
            <Ionicons name={perk.icon} size={14} color={colors.primary} />
          </View>
          <Text style={auth.perkText}>{perk.text}</Text>
        </View>
      ))}
    </View>

    <AppButton label="تسجيل الدخول" icon="log-in-outline" onPress={onLogin} variant="primary" size="lg" fullWidth />
    <AppButton
      label="إنشاء حساب جديد"
      icon="person-add-outline"
      onPress={onRegister}
      variant="secondary"
      fullWidth
    />
  </View>
);

const auth = StyleSheet.create({
  wrap: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
    ...shadows.soft
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm
  },
  iconRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  headerText: { flex: 1, minWidth: 0 },
  title: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: "800",
    textAlign: "right"
  },
  body: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    lineHeight: 21,
    textAlign: "right"
  },
  perksBlock: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.sm,
    gap: 8
  },
  perkRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs
  },
  perkIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  perkText: {
    flex: 1,
    color: colors.textSecondary,
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
