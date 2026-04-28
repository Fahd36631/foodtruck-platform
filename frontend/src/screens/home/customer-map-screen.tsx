import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { AppButton, CustomerMapView, Marker, SearchBar } from "@/ui";
import { FiltersBottomSheet } from "@/features/trucks/components/filters-bottom-sheet";
import { useTrucksDiscovery } from "@/features/trucks/hooks/use-trucks-discovery";
import type { DiscoveryFilters, TruckDiscoveryItem } from "@/features/trucks/types";
import { sortTrucksByDistance } from "@/features/trucks/utils";
import type { MainTabParamList } from "@/navigation/main-tabs";
import type { RootStackParamList } from "@/navigation/root-stack";
import { useAuthStore } from "@/store/auth-store";
import { colors, iconSize, radius, shadows, spacing, typography } from "@/theme/tokens";
import { formatDistanceKm, haversineKm } from "@/utils/geo";
import { formatPrepEstimate } from "@/utils/prep-time";
import MapView, { type Region } from "react-native-maps";

const DEFAULT_REGION: Region = {
  latitude: 24.7136,
  longitude: 46.6753,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12
};

type MapNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Map">,
  NativeStackNavigationProp<RootStackParamList>
>;

export const CustomerMapScreen = () => {
  const navigation = useNavigation<MapNav>();
  const accessToken = useAuthStore((s) => s.accessToken) ?? "";

  const [filters, setFilters] = useState<DiscoveryFilters>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState<number | null>(null);
  const [previewTruck, setPreviewTruck] = useState<TruckDiscoveryItem | null>(null);

  const mapRef = useRef<MapView>(null);

  const { data: trucks = [] } = useTrucksDiscovery(filters, accessToken);

  const validTrucks = useMemo(
    () => trucks.filter((t) => Number.isFinite(Number(t.latitude)) && Number.isFinite(Number(t.longitude))),
    [trucks]
  );

  const orderedTrucks = useMemo(() => {
    const sorted = sortTrucksByDistance(validTrucks, userLat, userLng);
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((t) => t.display_name.toLowerCase().includes(q));
  }, [validTrucks, userLat, userLng, query]);

  const fitRegion = useCallback((lat: number, lng: number, delta = 0.08) => {
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: delta,
      longitudeDelta: delta
    };
  }, []);

  const initialRegion = useMemo((): Region => {
    if (userLat !== null && userLng !== null) {
      return fitRegion(userLat, userLng, 0.1);
    }
    const first = orderedTrucks[0];
    if (first) return fitRegion(Number(first.latitude), Number(first.longitude), 0.14);
    return DEFAULT_REGION;
  }, [userLat, userLng, orderedTrucks, fitRegion]);

  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setLocationDenied(true);
        return;
      }
      setLocationDenied(false);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLat(pos.coords.latitude);
      setUserLng(pos.coords.longitude);
    } catch {
      setLocationDenied(true);
    }
  }, []);

  useEffect(() => {
    void requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (userLat !== null && userLng !== null) {
      mapRef.current?.animateToRegion(fitRegion(userLat, userLng, 0.1), 450);
      return;
    }
    const first = orderedTrucks[0];
    if (first) {
      mapRef.current?.animateToRegion(fitRegion(Number(first.latitude), Number(first.longitude), 0.14), 400);
    }
  }, [userLat, userLng, orderedTrucks, fitRegion]);

  useEffect(() => {
    if (selectedTruckId === null) return;
    const t = orderedTrucks.find((x) => x.id === selectedTruckId);
    if (!t) return;
    mapRef.current?.animateToRegion(fitRegion(Number(t.latitude), Number(t.longitude), 0.06), 400);
  }, [selectedTruckId, orderedTrucks, fitRegion]);

  const recenterOnUser = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setLocationDenied(true);
        return;
      }
      setLocationDenied(false);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setUserLat(lat);
      setUserLng(lng);
      mapRef.current?.animateToRegion(fitRegion(lat, lng, 0.09), 500);
    } catch {
      setLocationDenied(true);
    }
  }, [fitRegion]);

  const onSelectTruck = useCallback((truck: TruckDiscoveryItem) => {
    setSelectedTruckId(truck.id);
    setPreviewTruck(truck);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewTruck(null);
  }, []);

  const navigateTruck = useCallback(
    (truck: TruckDiscoveryItem) => {
      navigation.navigate("TruckDetails", { truckId: truck.id, truckName: truck.display_name });
    },
    [navigation]
  );

  const distanceForTruck = useCallback(
    (t: TruckDiscoveryItem) => {
      if (userLat === null || userLng === null) return null;
      const km = haversineKm(userLat, userLng, Number(t.latitude), Number(t.longitude));
      return formatDistanceKm(km);
    },
    [userLat, userLng]
  );

  const sheetMeta = useMemo(() => {
    if (!previewTruck) return null;
    const ratingNum = Number(previewTruck.avg_rating);
    const hasRatings = (previewTruck.rating_count ?? 0) > 0 && Number.isFinite(ratingNum) && ratingNum > 0;
    const dist = distanceForTruck(previewTruck);
    const prep = formatPrepEstimate(previewTruck.working_hours ?? null);
    return { ratingNum, hasRatings, dist, prep };
  }, [previewTruck, distanceForTruck]);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>الخريطة</Text>
        <Text style={styles.pageSub}>{orderedTrucks.length} ترك بالقرب · اضغط العلامة للمعاينة</Text>
        <View style={styles.searchRow}>
          <SearchBar value={query} onChange={setQuery} />
        </View>
      </View>

      <View style={styles.mapShell}>
        {locationDenied ? (
          <View style={styles.locationGate}>
            <Ionicons name="location-outline" size={40} color={colors.primary} />
            <Text style={styles.gateTitle}>فعّل الموقع</Text>
            <Text style={styles.gateBody}>نحتاج موقعك لعرض التركات القريبة بدقة على الخريطة.</Text>
            <AppButton label="السماح بالموقع" onPress={() => void requestLocation()} variant="primary" fullWidth />
          </View>
        ) : (
          <>
            <CustomerMapView
              ref={mapRef}
              style={styles.map}
              initialRegion={initialRegion}
              showsUserLocation={userLat !== null}
              showsMyLocationButton={false}
              userInterfaceStyle="light"
            >
              {orderedTrucks.map((truck) => {
                const lat = Number(truck.latitude);
                const lng = Number(truck.longitude);
                const selected = truck.id === selectedTruckId;
                return (
                  <Marker key={`map-m-${truck.id}`} coordinate={{ latitude: lat, longitude: lng }} onPress={() => onSelectTruck(truck)}>
                    <View style={[styles.pin, selected && styles.pinSelected]}>
                      <Ionicons name="restaurant" size={18} color={selected ? colors.onPrimary : colors.primary} />
                    </View>
                  </Marker>
                );
              })}
            </CustomerMapView>

            <View style={styles.floatingControls} pointerEvents="box-none">
              <Pressable
                style={styles.floatingBtn}
                onPress={() => setFilterOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="فلترة"
              >
                <Ionicons name="options-outline" size={iconSize.md} color={colors.primaryDark} />
                <Text style={styles.floatingBtnText}>فلترة</Text>
              </Pressable>
              <Pressable style={styles.floatingBtn} onPress={() => void recenterOnUser()} accessibilityRole="button" accessibilityLabel="موقعي الحالي">
                <Ionicons name="navigate" size={iconSize.md} color={colors.primaryDark} />
                <Text style={styles.floatingBtnText}>موقعي</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      <Modal visible={previewTruck !== null && sheetMeta !== null} transparent animationType="slide" onRequestClose={closePreview}>
        <Pressable style={styles.sheetBackdrop} onPress={closePreview}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {previewTruck && sheetMeta ? (
              <>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>{previewTruck.display_name}</Text>
                <View style={styles.sheetStats}>
                  <View style={styles.statRow}>
                    <Ionicons name="star" size={iconSize.sm} color={sheetMeta.hasRatings ? colors.warning : colors.textMuted} />
                    {sheetMeta.hasRatings ? (
                      <Text style={styles.statText}>
                        {sheetMeta.ratingNum.toLocaleString("ar-SA", { maximumFractionDigits: 1 })} ({previewTruck.rating_count})
                      </Text>
                    ) : (
                      <Text style={styles.statMuted}>بدون تقييمات بعد</Text>
                    )}
                  </View>
                  <View style={styles.statRow}>
                    <Ionicons name="navigate-outline" size={iconSize.sm} color={colors.primary} />
                    <Text style={styles.statText}>{sheetMeta.dist ?? "فعّل الموقع لعرض المسافة"}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Ionicons name="timer-outline" size={iconSize.sm} color={colors.primaryDark} />
                    <Text style={styles.statText}>وقت التجهيز تقريبًا: {sheetMeta.prep}</Text>
                  </View>
                </View>
                <View style={styles.sheetActions}>
                  <AppButton
                    label="عرض المنيو"
                    onPress={() => {
                      closePreview();
                      navigateTruck(previewTruck);
                    }}
                    variant="primary"
                    fullWidth
                  />
                  <AppButton label="إغلاق" onPress={closePreview} variant="ghost" fullWidth />
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <FiltersBottomSheet visible={filterOpen} initialFilters={filters} onClose={() => setFilterOpen(false)} onApply={setFilters} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface
  },
  pageTitle: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: "800",
    textAlign: "right",
    writingDirection: "rtl"
  },
  pageSub: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: typography.caption,
    textAlign: "right",
    writingDirection: "rtl"
  },
  searchRow: {
    marginTop: spacing.sm
  },
  mapShell: {
    flex: 1,
    position: "relative",
    backgroundColor: colors.surface2
  },
  map: {
    flex: 1
  },
  floatingControls: {
    position: "absolute",
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  },
  floatingBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.soft
  },
  floatingBtnText: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.caption
  },
  pin: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft
  },
  pinSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark
  },
  locationGate: {
    flex: 1,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.section
  },
  gateTitle: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: "800"
  },
  gateBody: {
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.sm
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end"
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderColor: colors.border,
    ...shadows.card
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md
  },
  sheetTitle: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: "800",
    textAlign: "center"
  },
  sheetStats: {
    marginTop: spacing.md,
    gap: spacing.sm
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "center",
    flexWrap: "wrap"
  },
  statText: {
    color: colors.text,
    fontSize: typography.bodySm,
    fontWeight: "600",
    textAlign: "center"
  },
  statMuted: {
    color: colors.textMuted,
    fontSize: typography.bodySm,
    fontWeight: "600"
  },
  sheetActions: {
    marginTop: spacing.lg,
    gap: spacing.sm
  }
});
