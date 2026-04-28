import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/theme/tokens";

type AppContainerProps = {
  children: ReactNode;
  edges?: ("top" | "bottom")[];
};

export const AppContainer = ({ children, edges = ["top"] }: AppContainerProps) => {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <View style={styles.fill}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg
  },
  fill: {
    flex: 1
  }
});
