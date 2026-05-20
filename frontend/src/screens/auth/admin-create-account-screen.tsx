import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";

import { AppButton, AppContainer } from "@/ui";
import { createAdminAccount } from "@/features/admin/api";
import type { RootStackParamList } from "@/navigation/root-stack";
import { getReadableNetworkError } from "@/api/network-error";
import { useAuthStore } from "@/store/auth-store";
import { spacing, typography } from "@/theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList & { AdminCreateAccount: undefined }, "AdminCreateAccount">;

const EDIT = {
  orange: "#FF6B00",
  text: "#0F1B35",
  muted: "#64748B",
  border: "#E5EEF7",
  bg: "#F7FAFD",
  white: "#FFFFFF",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  successSoft: "#FFF4EB"
} as const;

export const AdminCreateAccountScreen = ({ navigation }: Props) => {
  const accessToken = useAuthStore((s) => s.accessToken) ?? "";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      createAdminAccount(
        {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password
        },
        accessToken
      ),
    onSuccess: () => {
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setErrorMessage("");
      setSuccessMessage("تم إنشاء حساب الأدمن بنجاح.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setErrorMessage(getReadableNetworkError(error));
    }
  });

  const canSubmit = fullName.trim() && email.trim() && phone.trim() && password.length >= 6;

  return (
    <AppContainer edges={["top"]}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={EDIT.orange} />
          </Pressable>
          <Text style={styles.pageTitle}>إنشاء حساب أدمن</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>بيانات المدير الجديد</Text>
          <Text style={styles.sectionSub}>أدخل بيانات حساب الأدمن الذي تريد إضافته للنظام.</Text>
          <Field label="الاسم الكامل" value={fullName} onChangeText={setFullName} placeholder="اسم الأدمن الجديد" />
          <Field
            label="البريد الإلكتروني"
            value={email}
            onChangeText={setEmail}
            placeholder="admin@mail.com"
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
          <Field label="كلمة المرور" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
          {password.length > 0 && password.length < 6 ? (
            <Text style={styles.fieldError}>ستة أحرف على الأقل لكلمة المرور</Text>
          ) : null}
          <AppButton
            label="إنشاء حساب أدمن"
            icon="person-add-outline"
            variant="primary"
            onPress={() => {
              setErrorMessage("");
              setSuccessMessage("");
              createMutation.mutate();
            }}
            disabled={!canSubmit || createMutation.isPending}
            loading={createMutation.isPending}
            fullWidth
          />
        </View>

        {successMessage ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color={EDIT.orange} />
            <Text style={styles.successBannerText}>{successMessage}</Text>
          </View>
        ) : null}

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
      writingDirection="rtl"
    />
  </View>
);

const fieldStyles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    color: EDIT.muted,
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "right",
    writingDirection: "rtl"
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: EDIT.border,
    backgroundColor: EDIT.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    color: EDIT.text,
    fontSize: typography.bodySm,
    writingDirection: "rtl"
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
    flexDirection: "row-reverse",
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
    textAlign: "center",
    writingDirection: "rtl"
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
    writingDirection: "rtl"
  },
  sectionSub: {
    color: EDIT.muted,
    fontSize: typography.caption,
    lineHeight: 19,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 4
  },
  fieldError: {
    color: EDIT.danger,
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "right",
    writingDirection: "rtl"
  },
  successBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 0, 0.35)",
    backgroundColor: EDIT.successSoft
  },
  successBannerText: {
    flex: 1,
    color: EDIT.orange,
    fontWeight: "700",
    fontSize: typography.bodySm,
    textAlign: "right",
    writingDirection: "rtl"
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
    textAlign: "right",
    writingDirection: "rtl"
  }
});
