import {
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
import { useEffect, useState } from "react";

import { colors, radius, shadows, spacing, typography } from "@/theme/tokens";

import type { DiscoveryFilters } from "../types";

type FiltersBottomSheetProps = {
  visible: boolean;
  initialFilters: DiscoveryFilters;
  onClose: () => void;
  onApply: (filters: DiscoveryFilters) => void;
};

export const FiltersBottomSheet = ({ visible, initialFilters, onClose, onApply }: FiltersBottomSheetProps) => {
  const [city, setCity] = useState(initialFilters.city ?? "");
  const [neighborhood, setNeighborhood] = useState(initialFilters.neighborhood ?? "");

  useEffect(() => {
    if (visible) {
      setCity(initialFilters.city ?? "");
      setNeighborhood(initialFilters.neighborhood ?? "");
    }
  }, [visible, initialFilters.city, initialFilters.neighborhood]);

  const handleApply = () => {
    onApply({
      city: city.trim() || undefined,
      neighborhood: neighborhood.trim() || undefined,
      categoryId: initialFilters.categoryId
    });
    onClose();
  };

  const handleReset = () => {
    setCity("");
    setNeighborhood("");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.overlayTapArea} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={styles.title}>فلاتر الاستكشاف</Text>
              <Text style={styles.subtitle}>حدّد المدينة أو الحي لتضييق النتائج.</Text>

              <View style={styles.inputGroup}>
                <View>
                  <Text style={styles.fieldLabel}>المدينة</Text>
                  <TextInput
                    value={city}
                    onChangeText={setCity}
                    placeholder="مثال: الرياض"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    textAlign="right"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
                <View>
                  <Text style={styles.fieldLabel}>الحي</Text>
                  <TextInput
                    value={neighborhood}
                    onChangeText={setNeighborhood}
                    placeholder="مثال: النخيل"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    textAlign="right"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleApply}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.buttonRow}>
              <Pressable onPress={handleReset} style={styles.resetButton} hitSlop={8}>
                <Text style={styles.resetText}>مسح</Text>
              </Pressable>
              <Pressable onPress={handleApply} style={styles.applyButton}>
                <Text style={styles.applyText}>تطبيق الفلاتر</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay
  },
  overlayTapArea: {
    flex: 1
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: spacing.lg,
    maxHeight: "85%"
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm
  },
  title: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: "900",
    textAlign: "right"
  },
  subtitle: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    textAlign: "right"
  },
  inputGroup: {
    marginTop: spacing.md,
    gap: spacing.sm
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "right"
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: typography.body,
    fontWeight: "600"
  },
  buttonRow: {
    marginTop: spacing.lg,
    flexDirection: "row-reverse",
    gap: spacing.sm
  },
  resetButton: {
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  applyButton: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.cta
  },
  resetText: {
    color: colors.textSecondary,
    fontWeight: "800",
    fontSize: typography.bodySm
  },
  applyText: {
    color: colors.onPrimary,
    fontWeight: "800",
    fontSize: typography.body
  }
});
