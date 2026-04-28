import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { colors, radius, shadows, spacing, typography } from "@/theme/tokens";
import { StatusBadge } from "@/ui";
import { resolveMediaUrl } from "@/utils/media-url";

import type { TruckDiscoveryItem } from "../types";

type FeaturedTruckCardProps = {
  truck: TruckDiscoveryItem;
  distance?: string | null;
  onPress: () => void;
};

const operationalStatus = (status: string): "open" | "busy" | "closed" | "offline" => {
  if (status === "open") return "open";
  if (status === "paused") return "busy";
  if (status === "closed") return "closed";
  return "offline";
};

export const FeaturedTruckCard = ({ truck, distance, onPress }: FeaturedTruckCardProps) => {
  const imageUri = resolveMediaUrl(truck.cover_image_url);
  const ratingNum = Number(truck.avg_rating);
  const hasRating = (truck.rating_count ?? 0) > 0 && Number.isFinite(ratingNum) && ratingNum > 0;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.imageWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.85)"]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.badgeWrap}>
          <StatusBadge status={operationalStatus(truck.operational_status)} compact />
        </View>
        <View style={styles.footer}>
          <Text style={styles.name} numberOfLines={1}>
            {truck.display_name}
          </Text>
          {truck.category_name ? (
            <Text style={styles.category} numberOfLines={1}>
              {truck.category_name}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="star" size={14} color={hasRating ? colors.warning : "#D0D4DE"} />
              <Text style={styles.metaText}>
                {hasRating ? ratingNum.toLocaleString("ar-SA", { maximumFractionDigits: 1 }) : "—"}
              </Text>
            </View>
            {distance ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color="#D0D4DE" />
                <Text style={styles.metaText}>{distance}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 240,
    height: 280,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginLeft: spacing.sm,
    backgroundColor: colors.bgDeep,
    ...shadows.soft
  },
  cardPressed: {
    transform: [{ scale: 0.995 }]
  },
  imageWrap: {
    flex: 1
  },
  image: {
    width: "100%",
    height: "100%"
  },
  imagePlaceholder: {
    backgroundColor: colors.bgDeep
  },
  badgeWrap: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm
  },
  footer: {
    position: "absolute",
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    gap: 4
  },
  name: {
    color: "#FFFFFF",
    fontSize: typography.h3,
    fontWeight: "900",
    textAlign: "right"
  },
  category: {
    color: "#D0D4DE",
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "right"
  },
  metaRow: {
    marginTop: 4,
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  metaItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4
  },
  metaText: {
    color: "#FFFFFF",
    fontSize: typography.caption,
    fontWeight: "800"
  }
});
