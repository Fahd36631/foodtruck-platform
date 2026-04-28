import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { FiltersBottomSheet } from "@/features/trucks/components/filters-bottom-sheet";
import { TruckCard } from "@/features/trucks/components/truck-card";
import { useTrucksDiscovery } from "@/features/trucks/hooks/use-trucks-discovery";
import type { DiscoveryFilters } from "@/features/trucks/types";
import type { RootStackParamList } from "@/navigation/root-stack";
import { getReadableNetworkError } from "@/api/network-error";
import { appConfig } from "@/config/app-config";
import { EmptyState, ErrorState, LoadingSkeleton, SectionHeader } from "@/ui";
import { useAuthStore } from "@/store/auth-store";
import { colors, radius, shadows, spacing, typography } from "@/theme/tokens";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export const MapDiscoveryScreen = ({ navigation }: Props) => {
  const [filters, setFilters] = useState<DiscoveryFilters>({});
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken) ?? "";
  const { data, isLoading, isError, refetch, isFetching, error: discoveryError } = useTrucksDiscovery(filters, accessToken);

  const highlightedCount = useMemo(() => data?.length ?? 0, [data]);
  const discoveryErrorMessage = getReadableNetworkError(discoveryError);
  const showApiHint = !appConfig.isApiBaseUrlFromEnv;
  const items = data ?? [];
  const featuredTrucks = items.slice(0, Math.min(4, items.length));
  const nearbyTrucks = items.length > 4 ? items.slice(4) : [];

  const retry = () => {
    void refetch();
  };

  return (
    <View style={styles.screen}>
      <SectionHeader
        title="Discover Trucks"
        subtitle={`${highlightedCount} trucks near your filters`}
        actionLabel="Filters"
        onPressAction={() => setIsFilterVisible(true)}
      />

      <View style={styles.mapCard}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapCardTitle}>Map Preview</Text>
          <Ionicons name="map-outline" size={18} color={colors.brandBlue} />
        </View>
        <Text style={styles.mapCardSubtitle}>Production map integration (Mapbox/Google Maps) plugs here.</Text>
        <View style={styles.mapChipContainer}>
          {items.slice(0, 8).map((truck) => (
            <View key={truck.id} style={styles.mapChip}>
              <Text style={styles.mapChipText}>{truck.display_name}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.listWrapper}>
        {isLoading ? (
          <LoadingSkeleton />
        ) : null}

        {isError ? (
          <View>
            <ErrorState
              message={
                showApiHint
                  ? `${discoveryErrorMessage} Set EXPO_PUBLIC_API_BASE_URL in frontend/.env to your machine LAN IP.`
                  : discoveryErrorMessage
              }
              onRetry={retry}
            />
          </View>
        ) : null}

        {!isLoading && !isError ? (
          items.length === 0 ? (
            <EmptyState
              title="لا توجد نتائج"
              description="جرّب تغيير الفلاتر أو المنطقة."
              icon="compass-outline"
              actionLabel="تحديث"
              onAction={retry}
            />
          ) : (
            <FlatList
              data={nearbyTrucks}
              keyExtractor={(item) => String(item.id)}
              refreshing={isFetching}
              onRefresh={() => void refetch()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 70 }}
              ListHeaderComponent={
                <View style={styles.featuredSection}>
                  <Text style={styles.sectionLabel}>Featured Trucks</Text>
                  <FlatList
                    horizontal
                    data={featuredTrucks}
                    keyExtractor={(item) => `featured-${item.id}`}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.featuredListContent}
                    renderItem={({ item }) => (
                      <View style={styles.featuredCardWrap}>
                        <TruckCard
                          truck={item}
                          onPress={() => navigation.navigate("TruckDetails", { truckId: item.id, truckName: item.display_name })}
                        />
                      </View>
                    )}
                  />
                  <Text style={styles.sectionLabel}>Nearby</Text>
                </View>
              }
              renderItem={({ item }) => (
                <TruckCard
                  truck={item}
                  onPress={() => navigation.navigate("TruckDetails", { truckId: item.id, truckName: item.display_name })}
                />
              )}
            />
          )
        ) : null}
      </View>

      <FiltersBottomSheet
        visible={isFilterVisible}
        initialFilters={filters}
        onClose={() => setIsFilterVisible(false)}
        onApply={setFilters}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingTop: 56
  },
  mapCard: {
    marginTop: spacing.md,
    height: 188,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...shadows.soft
  },
  mapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  mapCardTitle: {
    color: colors.brandBlue,
    fontSize: typography.h3,
    fontWeight: "800"
  },
  mapCardSubtitle: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    lineHeight: 20
  },
  mapChipContainer: {
    marginTop: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  mapChip: {
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.primaryDark
  },
  mapChipText: {
    color: colors.onPrimary,
    fontSize: typography.micro,
    fontWeight: "800"
  },
  listWrapper: {
    marginTop: spacing.lg,
    flex: 1
  },
  featuredSection: {
    marginBottom: spacing.xs
  },
  sectionLabel: {
    color: colors.brandBlue,
    fontWeight: "800",
    fontSize: typography.h2,
    marginBottom: spacing.xs
  },
  featuredListContent: {
    paddingBottom: 8,
    gap: spacing.sm
  },
  featuredCardWrap: {
    width: 310
  }
});
