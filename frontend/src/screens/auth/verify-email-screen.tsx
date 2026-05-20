import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  getVerificationErrorMessage,
  login,
  resendVerificationCode,
  verifyEmail
} from "@/features/auth/api";
import type { RootStackParamList } from "@/navigation/root-stack";
import { useAuthStore } from "@/store/auth-store";
import { AppButton } from "@/ui";
import { colors, radius, shadows, spacing, typography } from "@/theme/tokens";

type VerifyEmailRoute = RouteProp<RootStackParamList, "VerifyEmail">;

const HERO_GRADIENT: readonly [string, string, string] = ["#FFB703", "#FF8A2B", "#FF6B00"];

export const VerifyEmailScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<VerifyEmailRoute>();
  const setSession = useAuthStore((s) => s.setSession);

  const { email, password, redirectTo } = route.params;

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const shouldRedirectBack = redirectTo === "Checkout" && navigation.canGoBack();

  const continueAfterAuth = () => {
    if (shouldRedirectBack) {
      navigation.goBack();
      return;
    }
    navigation.replace("MainTabs");
  };

  const verifyMutation = useMutation({
    mutationFn: () => verifyEmail(email, code.replace(/\D/g, "")),
    onSuccess: async () => {
      setFormError("");
      setCodeError("");
      const session = await login(email, password);
      setSession({ accessToken: session.accessToken, user: session.user });
      continueAfterAuth();
    },
    onError: (error) => {
      setSuccessMessage("");
      setFormError(getVerificationErrorMessage(error));
    }
  });

  const resendMutation = useMutation({
    mutationFn: () => resendVerificationCode(email),
    onSuccess: () => {
      setFormError("");
      setCodeError("");
      setSuccessMessage("تم إرسال رمز جديد إلى بريدك");
    },
    onError: (error) => {
      setSuccessMessage("");
      setFormError(getVerificationErrorMessage(error));
    }
  });

  const handleVerify = () => {
    setFormError("");
    setSuccessMessage("");
    const trimmed = code.replace(/\D/g, "");

    if (trimmed.length !== 6) {
      setCodeError("أدخل رمزًا مكونًا من 6 أرقام.");
      return;
    }

    setCodeError("");
    verifyMutation.mutate();
  };

  const handleResend = () => {
    setFormError("");
    setSuccessMessage("");
    resendMutation.mutate();
  };

  const isBusy = verifyMutation.isPending || resendMutation.isPending;

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient colors={HERO_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Pressable style={styles.backBtn} onPress={() => navigation.navigate("Auth", { initialMode: "login" })} hitSlop={8}>
              <Ionicons name="chevron-forward" size={22} color={colors.onPrimary} />
            </Pressable>
            <View style={styles.heroIconRing}>
              <Ionicons name="mail-open-outline" size={28} color={colors.onPrimary} />
            </View>
            <Text style={styles.heroTitle}>تحقق من بريدك الإلكتروني</Text>
            <Text style={styles.heroSubtitle}>أدخل رمز التحقق المرسل إلى بريدك</Text>
          </LinearGradient>

          <View style={styles.formShell}>
            <View style={styles.formCard}>
              <View style={styles.emailChip}>
                <Ionicons name="at" size={16} color={colors.primary} />
                <Text style={styles.emailText}>{email}</Text>
              </View>

              <View style={styles.codeWrap}>
                <Text style={styles.codeLabel}>رمز التحقق</Text>
                <TextInput
                  style={[styles.codeInput, codeError ? styles.codeInputError : null]}
                  value={code}
                  onChangeText={(value) => {
                    const digits = value.replace(/\D/g, "").slice(0, 6);
                    setCode(digits);
                    if (codeError) setCodeError("");
                    if (formError) setFormError("");
                  }}
                  placeholder="• • • • • •"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  textAlign="center"
                  autoComplete="one-time-code"
                />
                {codeError ? <Text style={styles.codeError}>{codeError}</Text> : null}
              </View>

              <AppButton
                label="تحقق"
                onPress={handleVerify}
                size="lg"
                fullWidth
                loading={verifyMutation.isPending}
                disabled={isBusy}
              />

              <AppButton
                label="إعادة إرسال الرمز"
                onPress={handleResend}
                variant="secondary"
                size="lg"
                fullWidth
                loading={resendMutation.isPending}
                disabled={isBusy}
              />

              {successMessage ? (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              ) : null}

              {formError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg
  },
  flex: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: spacing.xl
  },
  hero: {
    paddingTop: 56,
    paddingBottom: 64,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: "hidden"
  },
  backBtn: {
    alignSelf: "flex-end",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm
  },
  heroIconRing: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm
  },
  heroTitle: {
    color: colors.onPrimary,
    fontSize: typography.h2,
    fontWeight: "800",
    textAlign: "center"
  },
  heroSubtitle: {
    marginTop: 6,
    color: "rgba(255,255,255,0.92)",
    fontSize: typography.bodySm,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 22
  },
  formShell: {
    paddingHorizontal: spacing.lg,
    marginTop: -28
  },
  formCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card
  },
  emailChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong
  },
  emailText: {
    color: colors.text,
    fontSize: typography.bodySm,
    fontWeight: "800"
  },
  codeWrap: {
    gap: 8,
    marginTop: spacing.xs
  },
  codeLabel: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: "800",
    textAlign: "right"
  },
  codeInput: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    minHeight: 58,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 12,
    color: colors.text
  },
  codeInputError: {
    borderColor: colors.danger
  },
  codeError: {
    color: colors.danger,
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "right"
  },
  successBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.successMuted,
    borderWidth: 1,
    borderColor: colors.success
  },
  successText: {
    flex: 1,
    color: colors.success,
    fontSize: typography.bodySm,
    fontWeight: "700",
    textAlign: "right"
  },
  errorBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: typography.bodySm,
    fontWeight: "700",
    textAlign: "right"
  }
});
