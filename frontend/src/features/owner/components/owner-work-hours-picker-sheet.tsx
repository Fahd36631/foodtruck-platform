import { useEffect, useMemo, useState } from "react";
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { OWNER } from "@/features/owner/theme";
import { AppButton } from "@/ui";
import {
  buildTimeDate,
  formatTimeLabelPadded,
  getTimeParts,
  isValidWorkRange,
  type TimeParts
} from "@/utils/working-hours";
import { colors, radius, spacing, typography } from "@/theme/tokens";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

type OwnerWorkHoursPickerSheetProps = {
  visible: boolean;
  start: Date;
  end: Date;
  onClose: () => void;
  onConfirm: (start: Date, end: Date) => void;
};

const TimePickerBlock = ({
  label,
  parts,
  onChange
}: {
  label: string;
  parts: TimeParts;
  onChange: (next: TimeParts) => void;
}) => {
  const preview = formatTimeLabelPadded(buildTimeDate(parts));

  return (
    <View style={styles.block}>
      <Text style={styles.blockLabel}>{label}</Text>
      <Text style={styles.preview}>{preview}</Text>

      <Text style={styles.columnTitle}>الساعة</Text>
      <View style={styles.chipGrid}>
        {HOURS.map((hour) => {
          const active = parts.hour12 === hour;
          return (
            <Pressable
              key={hour}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange({ ...parts, hour12: hour })}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{hour}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.columnTitle}>الدقيقة</Text>
      <View style={styles.chipGrid}>
        {MINUTES.map((minute) => {
          const active = parts.minute === minute;
          return (
            <Pressable
              key={minute}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange({ ...parts, minute })}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{`${minute}`.padStart(2, "0")}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.columnTitle}>الفترة</Text>
      <View style={styles.periodRow}>
        {(["ص", "م"] as const).map((period) => {
          const active = parts.period === period;
          return (
            <Pressable
              key={period}
              style={[styles.periodChip, active && styles.chipActive]}
              onPress={() => onChange({ ...parts, period })}
            >
              <Text style={[styles.periodChipText, active && styles.chipTextActive]}>{period}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export const OwnerWorkHoursPickerSheet = ({ visible, start, end, onClose, onConfirm }: OwnerWorkHoursPickerSheetProps) => {
  const [startParts, setStartParts] = useState<TimeParts>(() => getTimeParts(start));
  const [endParts, setEndParts] = useState<TimeParts>(() => getTimeParts(end));

  useEffect(() => {
    if (!visible) return;
    Keyboard.dismiss();
    setStartParts(getTimeParts(start));
    setEndParts(getTimeParts(end));
  }, [visible, start, end]);

  const draftStart = useMemo(() => buildTimeDate(startParts), [startParts]);
  const draftEnd = useMemo(() => buildTimeDate(endParts), [endParts]);
  const rangeValid = isValidWorkRange(draftStart, draftEnd);

  const handleConfirm = () => {
    if (!rangeValid) return;
    onConfirm(draftStart, draftEnd);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={() => Keyboard.dismiss()}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>أوقات العمل</Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TimePickerBlock label="من" parts={startParts} onChange={setStartParts} />
            <TimePickerBlock label="إلى" parts={endParts} onChange={setEndParts} />
          </ScrollView>

          {!rangeValid ? <Text style={styles.hint}>يجب أن يكون وقت النهاية بعد وقت البداية.</Text> : null}

          <AppButton label="تأكيد" onPress={handleConfirm} variant="primary" fullWidth disabled={!rangeValid} />
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
  scroll: {
    maxHeight: 480
  },
  block: {
    marginBottom: spacing.md,
    gap: spacing.xs
  },
  blockLabel: {
    color: OWNER.orange,
    fontWeight: "800",
    fontSize: typography.bodySm,
    textAlign: "right",
    writingDirection: "rtl"
  },
  preview: {
    color: OWNER.text,
    fontWeight: "900",
    fontSize: typography.h2,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: spacing.xs
  },
  columnTitle: {
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: typography.caption,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xs
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
  chipActive: {
    borderColor: OWNER.orange,
    backgroundColor: OWNER.orangeLight
  },
  chipText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: typography.bodySm
  },
  chipTextActive: {
    color: OWNER.orangeDark
  },
  periodRow: {
    flexDirection: "row-reverse",
    gap: spacing.sm
  },
  periodChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: "center"
  },
  periodChipText: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.h3
  },
  hint: {
    color: colors.danger,
    fontSize: typography.caption,
    textAlign: "right",
    writingDirection: "rtl"
  }
});
