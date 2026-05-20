import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { OWNER } from "@/features/owner/theme";

type OwnerTabIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
  size: number;
};

export const OwnerTabIcon = ({ name, focused, color, size }: OwnerTabIconProps) => {
  const scale = useRef(new Animated.Value(focused ? 1.08 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.08 : 1,
      useNativeDriver: true,
      friction: 7,
      tension: 120
    }).start();
  }, [focused, scale]);

  return (
    <View style={styles.wrap}>
      {focused ? <View style={styles.dot} /> : null}
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={name} size={size} color={color} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28
  },
  dot: {
    position: "absolute",
    top: -2,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: OWNER.orange
  }
});
