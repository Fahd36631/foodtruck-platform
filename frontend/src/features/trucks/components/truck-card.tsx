import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, iconSize, radius, shadows, spacing, typography } from "@/theme/tokens";
import { StatusBadge } from "@/ui";
import { resolveMediaUrl } from "@/utils/media-url";
import { formatPrepEstimate } from "@/utils/prep-time";

import type { TruckDiscoveryItem } from "../types";

type TruckCardProps = {
  truck: TruckDiscoveryItem;
  distanceLabel?: string | null;
  onPress: () => void;
};

const operationalStatus = (status: string): "open" | "busy" | "closed" | "offline" => {
  if (status === "open") return "open";
  if (status === "paused") return "busy";
  if (status === "closed") return "closed";
  return "offline";
};

export const TruckCard = ({ truck, distanceLabel, onPress }: TruckCardProps) => {
  const imageUri = resolveMediaUrl(truck.cover_image_url);
  const ratingNum = Number(truck.avg_rating);
  const hasRating = (truck.rating_count ?? 0) > 0 && Number.isFinite(ratingNum) && ratingNum > 0;
  const prepLabel = formatPrepEstimate(truck.working_hours);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.imageWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="fast-food-outline" size={iconSize.lg} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.badgeWrap}>
          <StatusBadge status={operationalStatus(truck.operational_status)} compact />
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {truck.display_name}
        </Text>

        {truck.category_name ? <Text style={styles.category}>{truck.category_name}</Text> : null}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="star" size={iconSize.sm} color={hasRating ? colors.warning : colors.textMuted} />
            <Text style={styles.metaText}>
              {hasRating ? ratingNum.toLocaleString("ar-SA", { maximumFractionDigits: 1 }) : "بدون تقييم"}
            </Text>
            {hasRating ? <Text style={styles.metaMuted}>({truck.rating_count})</Text> : null}
          </View>

          {distanceLabel ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={iconSize.sm} color={colors.textMuted} />
              <Text style={styles.metaText}>{distanceLabel}</Text>
            </View>
          ) : null}

          {prepLabel ? (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={iconSize.sm} color={colors.textMuted} />
              <Text style={styles.metaText}>{prepLabel}</Text>
            </View>
          ) : null}
        </View>

        {(truck.city || truck.neighborhood) ? (
          <Text style={styles.location} numberOfLines={1}>
            {[truck.neighborhood, truck.city].filter(Boolean).join("، ")}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
    ...shadows.soft
  },
  cardPressed: {
    transform: [{ scale: 0.995 }]
  },
  imageWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: colors.bgDeep
  },
  image: {
    width: "100%",
    height: "100%"
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center"
  },
  badgeWrap: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs
  },
  body: {
    padding: spacing.sm,
    gap: 6
  },
  name: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
    textAlign: "right"
  },
  category: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "right"
  },
  metaRow: {
    marginTop: 2,
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  metaItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: "700"
  },
  metaMuted: {
    color: colors.textMuted,
    fontSize: typography.micro
  },
  location: {
    color: colors.textMuted,
    fontSize: typography.caption,
    textAlign: "right"
  }
});
