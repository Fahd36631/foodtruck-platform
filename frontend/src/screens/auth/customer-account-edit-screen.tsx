import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";

import { AppButton, AppContainer } from "@/ui";
import { changeMyPassword, updateMyProfile } from "@/features/auth/api";
import type { RootStackParamList } from "@/navigation/root-stack";
import { getReadableNetworkError } from "@/api/network-error";
import { useAuthStore } from "@/store/auth-store";
import { spacing, typography } from "@/theme/tokens";

type Props = NativeStackScreenProps<
  RootStackParamList & { CustomerAccountEdit: undefined },
  "CustomerAccountEdit"
>;

const EDIT = {
  orange: "#FF6B00",
  text: "#0F1B35",
  muted: "#64748B",
  border: "#E5EEF7",
  bg: "#F7FAFD",
  white: "#FFFFFF",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2"
} as const;

export const CustomerAccountEditScreen = ({ navigation }: Props) => {
  const accessToken = useAuthStore((s) => s.accessToken) ?? "";
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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

  return (
    <AppContainer edges={["top"]}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={EDIT.orange} />
          </Pressable>
          <Text style={styles.pageTitle}>معلومات الحساب</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>البيانات الشخصية</Text>
          <Field label="الاسم" value={fullName} onChangeText={setFullName} placeholder="أدخل اسمك" />
          <Field
            label="البريد الإلكتروني"
            value={email}
            onChangeText={setEmail}
            placeholder="example@mail.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="رقم الجوال"
            value={phone}
            onChangeText={setPhone}
            placeholder="+9665xxxxxxxx"
            keyboardType="phone-pad"
          />
          {profileErrors.map((msg) => (
            <Text key={msg} style={styles.fieldError}>
              {msg}
            </Text>
          ))}
          <AppButton
            label="حفظ التعديلات"
            variant="primary"
            onPress={() => {
              setErrorMessage("");
              updateProfileMutation.mutate();
            }}
            disabled={!canSaveProfile || isBusy || profileErrors.length > 0}
            loading={updateProfileMutation.isPending}
            fullWidth
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>كلمة المرور</Text>
          <Field
            label="كلمة المرور الحالية"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="••••••••"
            secureTextEntry
          />
          <Field
            label="كلمة المرور الجديدة"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="••••••••"
            secureTextEntry
          />
          {newPassword.length > 0 && newPassword.length < 6 ? (
            <Text style={styles.fieldError}>ستة أحرف على الأقل للكلمة الجديدة</Text>
          ) : null}
          <AppButton
            label="تحديث كلمة المرور"
            variant="secondary"
            onPress={() => {
              setErrorMessage("");
              changePasswordMutation.mutate();
            }}
            disabled={isBusy || !currentPassword || !newPassword || newPassword.length < 6}
            loading={changePasswordMutation.isPending}
            fullWidth
          />
        </View>

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={EDIT.danger} />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}
      </ScrollView>
    </AppContainer>
  );
};

const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences";
}) => (
  <View style={fieldStyles.wrap}>
    <Text style={fieldStyles.label}>{label}</Text>
    <TextInput
      style={fieldStyles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={EDIT.muted}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      textAlign="right"
    />
  </View>
);

const fieldStyles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    color: EDIT.muted,
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "right"
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: EDIT.border,
    backgroundColor: EDIT.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    color: EDIT.text,
    fontSize: typography.bodySm
  }
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: EDIT.bg },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    gap: spacing.md
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  pageTitle: {
    flex: 1,
    color: EDIT.text,
    fontSize: typography.h2,
    fontWeight: "900",
    textAlign: "center"
  },
  topBarSpacer: { width: 40 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: EDIT.border,
    backgroundColor: EDIT.white,
    padding: spacing.md,
    gap: spacing.sm
  },
  sectionTitle: {
    color: EDIT.text,
    fontSize: typography.body,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 4
  },
  fieldError: {
    color: EDIT.danger,
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "right"
  },
  errorBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: EDIT.danger,
    backgroundColor: EDIT.dangerSoft
  },
  errorBannerText: {
    flex: 1,
    color: EDIT.danger,
    fontWeight: "700",
    fontSize: typography.bodySm,
    textAlign: "right"
  }
});
