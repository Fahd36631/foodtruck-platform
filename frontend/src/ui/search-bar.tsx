import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TextInput, View } from "react-native";

import { colors, iconSize, radius, typography } from "@/theme/tokens";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export const SearchBar = ({ value, onChange, placeholder = "ابحث عن اسم الترك…" }: SearchBarProps) => {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={iconSize.sm} color={colors.primary} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        returnKeyType="search"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: typography.bodySm,
    paddingVertical: 12,
    textAlign: "right",
    writingDirection: "rtl"
  }
});
