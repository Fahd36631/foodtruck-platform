import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "@/theme/tokens";

type LoadingSkeletonProps = {
  rows?: number;
};

export const LoadingSkeleton = ({ rows = 3 }: LoadingSkeletonProps) => {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={styles.wrap}>
      {Array.from({ length: rows }).map((_, i) => (
        <Animated.View key={i} style={[styles.bar, { opacity }]} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    paddingVertical: spacing.sm
  },
  bar: {
    height: 96,
    borderRadius: radius.md,
    backgroundColor: colors.section,
    borderWidth: 1,
    borderColor: colors.border
  }
});
