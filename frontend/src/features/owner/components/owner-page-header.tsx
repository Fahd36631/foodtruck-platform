import { StyleSheet, Text, View } from "react-native";

import { OWNER, ownerSpacing, ownerTypography } from "@/features/owner/theme";

type OwnerPageHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  rightSlot?: React.ReactNode;
  compact?: boolean;
};

export const OwnerPageHeader = ({ title, subtitle, eyebrow, rightSlot, compact }: OwnerPageHeaderProps) => (
  <View style={[styles.wrap, compact && styles.wrapCompact]}>
    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
    <View style={styles.titleRow}>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {rightSlot}
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    marginBottom: ownerSpacing.section,
    gap: 6,
    width: "100%"
  },
  wrapCompact: {
    marginBottom: 0
  },
  eyebrow: {
    color: OWNER.orange,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
    writingDirection: "rtl"
  },
  titleRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  textCol: {
    flex: 1,
    alignItems: "flex-end"
  },
  title: {
    ...ownerTypography.screenTitle
  },
  subtitle: {
    ...ownerTypography.screenSub,
    marginTop: 6
  }
});
