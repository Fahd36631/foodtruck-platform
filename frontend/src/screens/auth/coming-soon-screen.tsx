import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { AppContainer } from "@/ui";
import type { RootStackParamList } from "@/navigation/root-stack";
import { spacing, typography } from "@/theme/tokens";

type ComingSoonParams = {
  title: string;
  message: string;
};

type Props = NativeStackScreenProps<
  RootStackParamList & { ComingSoon: ComingSoonParams },
  "ComingSoon"
>;

const SOON = {
  text: "#0F1B35",
  muted: "#64748B",
  orange: "#FF6B00",
  bg: "#F7FAFD",
  white: "#FFFFFF",
  border: "#E5EEF7"
} as const;

export const ComingSoonScreen = ({ route, navigation }: Props) => {
  const { title, message } = route.params;

  return (
    <AppContainer edges={["top"]}>
      <View style={styles.wrap}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={SOON.orange} />
        </Pressable>

        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="time-outline" size={32} color={SOON.orange} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </AppContainer>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: SOON.bg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: SOON.border,
    backgroundColor: SOON.white,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF4EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs
  },
  title: {
    color: SOON.text,
    fontSize: typography.h2,
    fontWeight: "900",
    textAlign: "center"
  },
  message: {
    color: SOON.muted,
    fontSize: typography.bodySm,
    lineHeight: 22,
    textAlign: "center"
  }
});
