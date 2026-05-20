import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
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

import { login, register } from "@/features/auth/api";
import { useAuthStore } from "@/store/auth-store";
import { AppButton } from "@/ui";
import { getReadableNetworkError } from "@/api/network-error";
import type { RootStackParamList } from "@/navigation/root-stack";
import { colors, radius, shadows, spacing, typography } from "@/theme/tokens";

// ============================================================
// Types & constants
// ============================================================

type Mode = "login" | "register";
type Role = "customer" | "truck_owner";
type FieldErrorKey = "fullName" | "phone" | "email" | "password";
type AuthRoute = RouteProp<RootStackParamList, "Auth">;

const COUNTRY_CODES = [
  { code: "+966", label: "السعودية", flag: "🇸🇦" },
  { code: "+971", label: "الإمارات", flag: "🇦🇪" },
  { code: "+965", label: "الكويت", flag: "🇰🇼" },
  { code: "+973", label: "البحرين", flag: "🇧🇭" },
  { code: "+974", label: "قطر", flag: "🇶🇦" },
  { code: "+20", label: "مصر", flag: "🇪🇬" }
] as const;

const HERO_GRADIENT: readonly [string, string, string] = ["#FFB703", "#FF8A2B", "#FF6B00"];

const MODE_COPY: Record<Mode, { title: string; subtitle: string; cta: string; switchPrompt: string; switchAction: string }> = {
  login: {
    title: "تسجيل الدخول",
    subtitle: "أهلاً بعودتك. سجّل الدخول للمتابعة من حيث توقّفت.",
    cta: "دخول",
    switchPrompt: "جديد على التطبيق؟",
    switchAction: "أنشئ حسابًا"
  },
  register: {
    title: "إنشاء حساب",
    subtitle: "انضم لآلاف المستخدمين واكتشف أفضل عربات الطعام حولك.",
    cta: "إنشاء الحساب",
    switchPrompt: "لديك حساب بالفعل؟",
    switchAction: "سجّل دخولك"
  }
};

// ============================================================
// Main component
// ============================================================

export const AuthScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<AuthRoute>();
  const setSession = useAuthStore((s) => s.setSession);

  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("customer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] =
    useState<(typeof COUNTRY_CODES)[number]["code"]>("+966");
  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldErrorKey, string>>>({});
  const [formError, setFormError] = useState("");

  // Sync initial mode from navigation params (once per change)
  useEffect(() => {
    const initial = route.params?.initialMode;
    if (initial === "login" || initial === "register") setMode(initial);
  }, [route.params?.initialMode]);

  // Redirect logic after success
  const redirectTo = route.params?.redirectTo;
  const shouldRedirectBack = redirectTo === "Checkout" && navigation.canGoBack();
  const continueAfterAuth = () => {
    if (shouldRedirectBack) {
      navigation.goBack();
      return;
    }
    navigation.replace("MainTabs");
  };

  // Mutations
  const loginMutation = useMutation({
    mutationFn: () => login(email.trim(), password),
    onSuccess: (data) => {
      setSession({ accessToken: data.accessToken, user: data.user });
      setFormError("");
      setFieldErrors({});
      continueAfterAuth();
    },
    onError: (error) => setFormError(getReadableNetworkError(error))
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: `${selectedCountryCode}${phone.replace(/\D/g, "")}`,
        password,
        roleCode: role
      }),
    onSuccess: async () => {
      await loginMutation.mutateAsync();
      setFormError("");
      setFieldErrors({});
    },
    onError: (error) => setFormError(getReadableNetworkError(error))
  });

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  const validateForm = (): boolean => {
    const nextErrors: Partial<Record<FieldErrorKey, string>> = {};
    const phoneDigits = phone.replace(/\D/g, "");

    if (mode === "register" && !fullName.trim()) {
      nextErrors.fullName = "الاسم الكامل مطلوب.";
    }
    if (!email.trim()) {
      nextErrors.email = "البريد الإلكتروني مطلوب.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "صيغة البريد الإلكتروني غير صحيحة.";
    }
    if (mode === "register") {
      if (!phoneDigits) nextErrors.phone = "رقم الجوال مطلوب.";
      else if (phoneDigits.length < 9) nextErrors.phone = "رقم الجوال قصير جدًا.";
    }
    if (!password.trim()) {
      nextErrors.password = "كلمة المرور مطلوبة.";
    } else if (password.trim().length < 8) {
      nextErrors.password = "كلمة المرور يجب أن تكون 8 أحرف على الأقل.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = () => {
    setFormError("");
    if (!validateForm()) return;
    if (mode === "login") {
      loginMutation.mutate();
      return;
    }
    registerMutation.mutate();
  };

  const copy = MODE_COPY[mode];
  const isRegister = mode === "register";

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
          <AuthHero mode={mode} title={copy.title} subtitle={copy.subtitle} />

          <View style={styles.formShell}>
            <View style={styles.formCard}>
              <ModeToggle mode={mode} onChange={setMode} />

              {isRegister ? (
                <>
                  <FormField
                    label="الاسم الكامل"
                    icon="person-outline"
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="أدخل اسمك الكامل"
                    error={fieldErrors.fullName}
                  />
                  <PhoneField
                    value={phone}
                    onChangeText={setPhone}
                    code={selectedCountryCode}
                    onOpenSheet={() => setIsCountryModalVisible(true)}
                    error={fieldErrors.phone}
                  />
                  <RoleChoice value={role} onChange={setRole} />
                </>
              ) : null}

              <FormField
                label="البريد الإلكتروني"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="example@mail.com"
                autoCapitalize="none"
                keyboardType="email-address"
                error={fieldErrors.email}
              />

              <FormField
                label="كلمة المرور"
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!isPasswordVisible}
                error={fieldErrors.password}
                rightAdornment={
                  <Pressable onPress={() => setIsPasswordVisible((v) => !v)} hitSlop={10}>
                    <Ionicons
                      name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={colors.textMuted}
                    />
                  </Pressable>
                }
              />

              <View style={styles.ctaWrap}>
                <AppButton
                  label={isLoading ? "جاري المعالجة..." : copy.cta}
                  icon={mode === "login" ? "log-in-outline" : "person-add-outline"}
                  onPress={submit}
                  variant="primary"
                  size="lg"
                  disabled={isLoading}
                  loading={isLoading}
                  fullWidth
                />
              </View>

              {formError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.errorBoxText}>{formError}</Text>
                </View>
              ) : null}
            </View>

            <SwitchFooter copy={copy} onSwitch={() => setMode(isRegister ? "login" : "register")} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CountrySheet
        visible={isCountryModalVisible}
        selectedCode={selectedCountryCode}
        onSelect={(code) => {
          setSelectedCountryCode(code);
          setIsCountryModalVisible(false);
        }}
        onClose={() => setIsCountryModalVisible(false)}
      />
    </View>
  );
};

// ============================================================
// Auth Hero (gradient + logo + animated title)
// ============================================================

const AuthHero = ({ mode, title, subtitle }: { mode: Mode; title: string; subtitle: string }) => {
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [mode, fade]);

  return (
    <LinearGradient colors={HERO_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={hero.wrap}>
      <View style={hero.decorOrb} />
      <View style={hero.decorOrbSmall} />

      <Animated.View
        style={[
          hero.textBlock,
          {
            opacity: fade,
            transform: [
              { translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }
            ]
          }
        ]}
      >
        <Text style={hero.kicker}>أهلاً بك</Text>
        <Text style={hero.title}>{title}</Text>
        <Text style={hero.subtitle}>{subtitle}</Text>
      </Animated.View>
    </LinearGradient>
  );
};

const hero = StyleSheet.create({
  wrap: {
    paddingTop: 88,
    paddingBottom: 72,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: "hidden"
  },
  decorOrb: {
    position: "absolute",
    top: -80,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255, 255, 255, 0.12)"
  },
  decorOrbSmall: {
    position: "absolute",
    bottom: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.08)"
  },
  textBlock: {
    marginTop: 4
  },
  kicker: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "right"
  },
  title: {
    marginTop: 4,
    color: colors.onPrimary,
    fontSize: typography.display,
    fontWeight: "800",
    textAlign: "right"
  },
  subtitle: {
    marginTop: 6,
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: typography.bodySm,
    lineHeight: 21,
    textAlign: "right"
  }
});

// ============================================================
// Mode Toggle (animated indicator)
// ============================================================

const ModeToggle = ({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) => {
  const renderCell = (target: Mode, label: string, icon: keyof typeof Ionicons.glyphMap) => {
    const active = mode === target;
    return (
      <Pressable
        key={target}
        onPress={() => onChange(target)}
        style={[toggle.cell, active && toggle.cellActive]}
      >
        <Ionicons
          name={icon}
          size={15}
          color={active ? colors.onPrimary : colors.textMuted}
        />
        <Text style={[toggle.label, active && toggle.labelActive]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={toggle.track}>
      {renderCell("login", "دخول", "log-in-outline")}
      {renderCell("register", "تسجيل", "person-add-outline")}
    </View>
  );
};

const toggle = StyleSheet.create({
  track: {
    flexDirection: "row-reverse",
    padding: 5,
    gap: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.section,
    marginBottom: spacing.xs
  },
  cell: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.pill,
    backgroundColor: "transparent"
  },
  cellActive: {
    backgroundColor: colors.primary,
    ...shadows.cta
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.bodySm,
    fontWeight: "700"
  },
  labelActive: {
    color: colors.onPrimary,
    fontWeight: "800"
  }
});

// ============================================================
// Form Field (label + icon + input)
// ============================================================

type FormFieldProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "phone-pad";
  secureTextEntry?: boolean;
  error?: string;
  rightAdornment?: React.ReactNode;
};

const FormField = ({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  autoCapitalize,
  keyboardType,
  secureTextEntry,
  error,
  rightAdornment
}: FormFieldProps) => {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={field.wrap}>
      <Text style={field.label}>{label}</Text>
      <View style={[field.box, { borderColor }]}>
        <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.textMuted} />
        <TextInput
          style={field.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightAdornment}
      </View>
      {error ? <Text style={field.error}>{error}</Text> : null}
    </View>
  );
};

const field = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: "800",
    textAlign: "right"
  },
  box: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    minHeight: 50
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: typography.bodySm,
    paddingVertical: 10,
    textAlign: "right",
    writingDirection: "rtl"
  },
  error: {
    color: colors.danger,
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "right"
  }
});

// ============================================================
// Phone Field (country picker + phone input)
// ============================================================

const PhoneField = ({
  value,
  onChangeText,
  code,
  onOpenSheet,
  error
}: {
  value: string;
  onChangeText: (v: string) => void;
  code: string;
  onOpenSheet: () => void;
  error?: string;
}) => {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={field.wrap}>
      <Text style={field.label}>رقم الجوال</Text>
      <View style={phone.row}>
        <Pressable style={phone.country} onPress={onOpenSheet}>
          <Ionicons name="chevron-down" size={14} color={colors.primary} />
          <Text style={phone.countryText}>{code}</Text>
        </Pressable>
        <View style={[field.box, phone.input, { borderColor }]}>
          <Ionicons name="call-outline" size={18} color={focused ? colors.primary : colors.textMuted} />
          <TextInput
            style={field.input}
            value={value}
            onChangeText={onChangeText}
            placeholder="5xxxxxxxx"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </View>
      </View>
      {error ? <Text style={field.error}>{error}</Text> : null}
    </View>
  );
};

const phone = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    gap: spacing.xs
  },
  country: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minWidth: 88,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.primarySoft
  },
  countryText: {
    color: colors.primaryDark,
    fontWeight: "800",
    fontSize: typography.bodySm
  },
  input: {
    flex: 1
  }
});

// ============================================================
// Role Choice (customer vs truck owner cards)
// ============================================================

const ROLE_OPTIONS: Array<{ id: Role; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "customer", label: "عميل", description: "اطلب من أفضل التركات", icon: "person" },
  { id: "truck_owner", label: "صاحب ترك", description: "اعرض منتجاتك واستقبل الطلبات", icon: "storefront" }
];

const RoleChoice = ({ value, onChange }: { value: Role; onChange: (r: Role) => void }) => (
  <View style={field.wrap}>
    <Text style={field.label}>نوع الحساب</Text>
    <View style={role.row}>
      {ROLE_OPTIONS.map((option) => {
        const selected = value === option.id;
        return (
          <Pressable
            key={option.id}
            style={[role.card, selected && role.cardSelected]}
            onPress={() => onChange(option.id)}
          >
            <View style={[role.iconWrap, selected && role.iconWrapSelected]}>
              <Ionicons
                name={option.icon}
                size={18}
                color={selected ? colors.onPrimary : colors.primary}
              />
            </View>
            <Text style={[role.title, selected && role.titleSelected]}>{option.label}</Text>
            <Text style={[role.desc, selected && role.descSelected]} numberOfLines={2}>
              {option.description}
            </Text>
            {selected ? (
              <View style={role.check}>
                <Ionicons name="checkmark" size={12} color={colors.onPrimary} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  </View>
);

const role = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    gap: spacing.xs
  },
  card: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    padding: spacing.sm,
    gap: 4,
    alignItems: "flex-end"
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4
  },
  iconWrapSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark
  },
  title: {
    color: colors.text,
    fontSize: typography.bodySm,
    fontWeight: "800",
    textAlign: "right"
  },
  titleSelected: {
    color: colors.primaryDark
  },
  desc: {
    color: colors.textMuted,
    fontSize: typography.micro,
    fontWeight: "600",
    textAlign: "right",
    lineHeight: 16
  },
  descSelected: {
    color: colors.text
  },
  check: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  }
});

// ============================================================
// Country Sheet (bottom sheet picker)
// ============================================================

const CountrySheet = ({
  visible,
  selectedCode,
  onSelect,
  onClose
}: {
  visible: boolean;
  selectedCode: string;
  onSelect: (code: (typeof COUNTRY_CODES)[number]["code"]) => void;
  onClose: () => void;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={sheet.backdrop} onPress={onClose}>
      <Pressable style={sheet.card} onPress={(e) => e.stopPropagation()}>
        <View style={sheet.handle} />
        <Text style={sheet.title}>اختر الدولة</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {COUNTRY_CODES.map((country) => {
            const isActive = country.code === selectedCode;
            return (
              <Pressable
                key={country.code}
                style={[sheet.option, isActive && sheet.optionActive]}
                onPress={() => onSelect(country.code)}
              >
                <Text style={sheet.flag}>{country.flag}</Text>
                <View style={sheet.optionBody}>
                  <Text style={[sheet.optionLabel, isActive && sheet.optionLabelActive]}>
                    {country.label}
                  </Text>
                  <Text style={sheet.optionCode}>{country.code}</Text>
                </View>
                {isActive ? (
                  <View style={sheet.checkRing}>
                    <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Pressable>
    </Pressable>
  </Modal>
);

const sheet = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    maxHeight: "60%"
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm
  },
  title: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: "800",
    marginBottom: spacing.sm,
    textAlign: "right"
  },
  option: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    marginBottom: 8
  },
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  flag: {
    fontSize: 22
  },
  optionBody: {
    flex: 1
  },
  optionLabel: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.bodySm,
    textAlign: "right"
  },
  optionLabelActive: {
    color: colors.primaryDark
  },
  optionCode: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "right"
  },
  checkRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  }
});

// ============================================================
// Switch Footer (swap between login/register)
// ============================================================

const SwitchFooter = ({
  copy,
  onSwitch
}: {
  copy: (typeof MODE_COPY)[Mode];
  onSwitch: () => void;
}) => (
  <Pressable style={footer.wrap} onPress={onSwitch} hitSlop={8}>
    <Text style={footer.prompt}>{copy.switchPrompt}</Text>
    <Text style={footer.action}>{copy.switchAction}</Text>
    <Ionicons name="arrow-back" size={14} color={colors.primary} />
  </Pressable>
);

const footer = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.xs
  },
  prompt: {
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    fontWeight: "600"
  },
  action: {
    color: colors.primary,
    fontSize: typography.bodySm,
    fontWeight: "800"
  }
});

// ============================================================
// Shell styles
// ============================================================

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scrollContent: {
    paddingBottom: spacing.xl
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
  ctaWrap: {
    marginTop: spacing.xs
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
  errorBoxText: {
    flex: 1,
    color: colors.danger,
    fontSize: typography.bodySm,
    fontWeight: "700",
    textAlign: "right"
  }
});
