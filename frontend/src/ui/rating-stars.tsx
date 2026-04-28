import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { colors, iconSize, spacing } from "@/theme/tokens";

type RatingStarsProps = {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  readonly?: boolean;
};

export const RatingStars = ({ value, onChange, size = iconSize.lg, readonly = false }: RatingStarsProps) => {
  const canPress = !readonly && !!onChange;

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        const color = active ? colors.warning : colors.border;
        const name = active ? "star" : "star-outline";
        return (
          <Pressable
            key={star}
            style={styles.starHit}
            onPress={canPress ? () => onChange(star) : undefined}
            disabled={!canPress}
            accessibilityRole={canPress ? "button" : undefined}
            accessibilityLabel={`تقييم ${star} من 5`}
          >
            <Ionicons name={name} size={size} color={color} />
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs
  },
  starHit: {
    padding: 2
  }
});
