import { useEffect, useMemo, useState } from "react";
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { OWNER } from "@/features/owner/theme";
import { AppButton } from "@/ui";
import {
  buildDateFromParts,
  buildYearOptions,
  clampDayToMonth,
  daysInMonth,
  formatLicenseExpiryPreview,
  getArabicMonthName,
  getDateParts,
  startOfDay,
  type DateParts
} from "@/utils/license-expiry-date";
import { colors, radius, spacing, typography } from "@/theme/tokens";

type OwnerLicenseExpiryPickerSheetProps = {
  visible: boolean;
  value: Date | null;
  minimumDate?: Date;
  onClose: () => void;
  onConfirm: (date: Date) => void;
};

export const OwnerLicenseExpiryPickerSheet = ({
  visible,
  value,
  minimumDate = new Date(),
  onClose,
  onConfirm
}: OwnerLicenseExpiryPickerSheetProps) => {
  const minDay = useMemo(() => startOfDay(minimumDate), [minimumDate]);
  const minParts = useMemo(() => getDateParts(minDay), [minDay]);
  const yearOptions = useMemo(() => buildYearOptions(minParts.year), [minParts.year]);

  const [parts, setParts] = useState<DateParts>(() => getDateParts(value ?? minDay));
  const [hasSelected, setHasSelected] = useState(false);

  useEffect(() => {
    if (!visible) return;
    Keyboard.dismiss();
    const initial = value ?? minDay;
    setParts(clampDayToMonth(getDateParts(initial)));
    setHasSelected(!!value);
  }, [visible, value, minDay]);

  const draftDate = useMemo(() => startOfDay(buildDateFromParts(parts)), [parts]);
  const isOnOrAfterMin = draftDate.getTime() >= minDay.getTime();
  const dayOptions = useMemo(() => {
    const max = daysInMonth(parts.year, parts.month);
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [parts.year, parts.month]);

  const updateParts = (next: DateParts) => {
    setHasSelected(true);
    setParts(clampDayToMonth(next));
  };

  const handleConfirm = () => {
    if (!hasSelected || !isOnOrAfterMin) return;
    onConfirm(draftDate);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={() => Keyboard.dismiss()}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>تاريخ انتهاء الرخصة</Text>
          <Text style={styles.preview}>{formatLicenseExpiryPreview(parts)}</Text>
          <Text style={styles.isoPreview}>{`${parts.year}-${`${parts.month}`.padStart(2, "0")}-${`${parts.day}`.padStart(2, "0")}`}</Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.columnTitle}>السنة</Text>
            <View style={styles.chipGrid}>
              {yearOptions.map((year) => {
                const active = parts.year === year;
                return (
                  <Pressable
                    key={year}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => updateParts({ ...parts, year })}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{year}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.columnTitle}>الشهر</Text>
            <View style={styles.chipGrid}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                const active = parts.month === month;
                return (
                  <Pressable
                    key={month}
                    style={[styles.chip, styles.monthChip, active && styles.chipActive]}
                    onPress={() => updateParts({ ...parts, month })}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{getArabicMonthName(month)}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.columnTitle}>اليوم</Text>
            <View style={styles.chipGrid}>
              {dayOptions.map((day) => {
                const active = parts.day === day;
                return (
                  <Pressable
                    key={day}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => updateParts({ ...parts, day })}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {!isOnOrAfterMin ? <Text style={styles.hint}>اختر تاريخًا من اليوم فصاعدًا.</Text> : null}

          <AppButton label="تأكيد التاريخ" onPress={handleConfirm} variant="primary" fullWidth disabled={!hasSelected || !isOnOrAfterMin} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay
  },
  dismiss: {
    flex: 1
  },
  sheet: {
    direction: "rtl",
    maxHeight: "88%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm
  },
  title: {
    color: OWNER.text,
    fontWeight: "800",
    fontSize: typography.h3,
    textAlign: "right",
    writingDirection: "rtl"
  },
  preview: {
    color: OWNER.text,
    fontWeight: "900",
    fontSize: typography.h2,
    textAlign: "right",
    writingDirection: "rtl"
  },
  isoPreview: {
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: typography.bodySm,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: spacing.xs
  },
  scroll: {
    maxHeight: 420
  },
  columnTitle: {
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: typography.caption,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.sm,
    marginBottom: spacing.xs
  },
  chipGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  chip: {
    minWidth: 44,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: "center"
  },
  monthChip: {
    minWidth: 72
  },
  chipActive: {
    borderColor: OWNER.orange,
    backgroundColor: OWNER.orangeLight
  },
  chipText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: typography.bodySm,
    writingDirection: "rtl"
  },
  chipTextActive: {
    color: OWNER.orangeDark
  },
  hint: {
    color: colors.danger,
    fontSize: typography.caption,
    textAlign: "right",
    writingDirection: "rtl"
  }
});
