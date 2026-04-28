import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";

import { AppButton, AppContainer, EmptyState, ErrorState, LoadingSkeleton } from "@/ui";
import { FiltersBottomSheet } from "@/features/trucks/components/filters-bottom-sheet";
import { FeaturedTruckCard } from "@/features/trucks/components/featured-truck-card";
import { TruckCard } from "@/features/trucks/components/truck-card";
import { OrderCard } from "@/features/orders/components/order-card";
import { getMyPickupOrders } from "@/features/orders/api";
import { useTrucksDiscovery } from "@/features/trucks/hooks/use-trucks-discovery";
import type { DiscoveryFilters, TruckDiscoveryItem } from "@/features/trucks/types";
import { sortTrucksByDistance } from "@/features/trucks/utils";
import type { MainTabParamList } from "@/navigation/main-tabs";
import type { RootStackParamList } from "@/navigation/root-stack";
import { getReadableNetworkError } from "@/api/network-error";
import { useAuthStore } from "@/store/auth-store";
import { colors, hitSlop, iconSize, radius, shadows, spacing, typography } from "@/theme/tokens";
import { formatDistanceKm, haversineKm } from "@/utils/geo";

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Home">,
  NativeStackNavigationProp<RootStackParamList>
>;

const statusLabel: Record<string, string> = {
  pending: "جديد",
  preparing: "قيد التحضير",
  ready: "جاهز للاستلام",
  picked_up: "تم الاستلام",
  cancelled: "ملغي"
};

const greetingForHour = () => {
  const h = new Date().getHours();
  if (h < 12) return "صباح الخير";
  if (h < 17) return "مساء الخير";
  return "مساء النور";
};

type CategoryKey = "all" | "burger" | "shawarma" | "coffee" | "sweets" | "pizza";

const CATEGORIES: { key: CategoryKey; label: string; icon: keyof typeof Ionicons.glyphMap; match: string[] }[] = [
  { key: "all", label: "الكل", icon: "sparkles", match: [] },
  { key: "burger", label: "برجر", icon: "fast-food", match: ["برجر", "burger"] },
  { key: "shawarma", label: "شاورما", icon: "flame", match: ["شاورما", "shawarma"] },
  { key: "coffee", label: "قهوة", icon: "cafe", match: ["قهوة", "coffee", "كوفي"] },
  { key: "sweets", label: "حلى", icon: "ice-cream", match: ["حلى", "حلو", "sweet"] },
  { key: "pizza", label: "بيتزا", icon: "pizza", match: ["بيتزا", "pizza"] }
];

const matchesCategory = (cat: CategoryKey, categoryName: string | null | undefined) => {
  if (cat === "all") return true;
  const needle = (categoryName ?? "").toLowerCase().trim();
  if (!needle) return false;
  const def = CATEGORIES.find((c) => c.key === cat);
  return def?.match.some((m) => needle.includes(m.toLowerCase())) ?? true;
};

export const HomeScreen = () => {
  const navigation = useNavigation<HomeNav>();
  const accessToken = useAuthStore((s) => s.accessToken) ?? "";
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<DiscoveryFilters>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  const listRef = useRef<FlatList<TruckDiscoveryItem>>(null);
  const categoriesRef = useRef<ScrollView>(null);
  const featuredRef = useRef<ScrollView>(null);

  const discoveryQuery = useTrucksDiscovery(filters, accessToken);
  const trucks = discoveryQuery.data ?? [];

  const ordersQuery = useQuery({
    queryKey: ["customer-pickup-orders", accessToken],
    queryFn: () => getMyPickupOrders(accessToken),
    enabled: !!accessToken
  });

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

  const orderedTrucks = useMemo(() => {
    const sorted = sortTrucksByDistance(trucks, userLat, userLng);
    const q = query.trim().toLowerCase();
    const byCat = sorted.filter((t) => matchesCategory(activeCategory, t.category_name));
    if (!q) return byCat;
    return byCat.filter((t) => t.display_name.toLowerCase().includes(q));
  }, [trucks, userLat, userLng, query, activeCategory]);

  const distanceForTruck = useCallback(
    (t: TruckDiscoveryItem) => {
      if (userLat === null || userLng === null) return null;
      const km = haversineKm(userLat, userLng, Number(t.latitude), Number(t.longitude));
      return formatDistanceKm(km);
    },
    [userLat, userLng]
  );

  const navigateTruck = useCallback(
    (truck: TruckDiscoveryItem) => {
      navigation.navigate("TruckDetails", { truckId: truck.id, truckName: truck.display_name });
    },
    [navigation]
  );

  const currentOrders = useMemo(
    () => (ordersQuery.data ?? []).filter((o) => ["pending", "preparing", "ready"].includes(o.status)),
    [ordersQuery.data]
  );

  const primaryActiveOrder = currentOrders[0];

  const onRefresh = useCallback(async () => {
    await Promise.all([discoveryQuery.refetch(), ordersQuery.refetch(), requestLocation()]);
  }, [discoveryQuery, ordersQuery, requestLocation]);

  const locationLine = useMemo(() => {
    if (locationDenied) return "الموقع غير مفعّل";
    if (userLat !== null && userLng !== null) return "تم تحديد موقعك الحالي";
    return "جاري تحديد الموقع…";
  }, [locationDenied, userLat, userLng]);

  const greetingName = user?.fullName?.trim() ? user.fullName.trim().split(" ")[0] : "ضيفنا";

  const featuredTrucks = useMemo(() => {
    const sorted = [...trucks].sort((a, b) => {
      const ra = Number(a.avg_rating ?? 0);
      const rb = Number(b.avg_rating ?? 0);
      if (rb !== ra) return rb - ra;
      return (b.rating_count ?? 0) - (a.rating_count ?? 0);
    });
    return sorted.slice(0, 5);
  }, [trucks]);

  const listData = discoveryQuery.isLoading || discoveryQuery.isError ? [] : orderedTrucks;

  // RTL fix: snap horizontal scrolls to the right edge so the first item appears on the right
  const snapToRight = (ref: React.RefObject<ScrollView | null>) => () => {
    ref.current?.scrollToEnd({ animated: false });
  };

  const listHeader = (
    <View>
      {/* ——— HERO ——— */}
      <LinearGradient
        colors={["#FFB703", "#FF8A2B", "#FF6B00"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + spacing.md }]}
      >
        <View style={styles.heroTopRow}>
          <Pressable
            style={styles.heroBell}
            hitSlop={hitSlop}
            onPress={() => navigation.navigate("Orders")}
            accessibilityRole="button"
          >
            <Ionicons name="notifications-outline" size={iconSize.md} color={colors.brandBlue} />
          </Pressable>
          <View style={styles.heroLocationPill}>
            <View style={styles.heroLocationDot} />
            <Text style={styles.heroLocationText} numberOfLines={1}>
              {locationLine}
            </Text>
          </View>
        </View>

        <Text style={styles.heroGreeting}>
          {greetingForHour()}،{" "}
          <Text style={styles.heroGreetingName}>{greetingName}</Text>
        </Text>
        <Text style={styles.heroSub}>اكتشف أقرب عربات الطعام حولك</Text>

        {/* floating search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={iconSize.md} color={colors.primary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="ابحث عن ترك، نوع أكل، أو حي…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            textAlign="right"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} hitSlop={hitSlop}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
          <Pressable
            style={styles.searchFilter}
            onPress={() => setFilterOpen(true)}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel="فلاتر"
          >
            <Ionicons name="options-outline" size={iconSize.md} color={colors.onPrimary} />
          </Pressable>
        </View>
      </LinearGradient>

      {/* ——— ACTIVE ORDER (if any) ——— */}
      {primaryActiveOrder ? (
        <Pressable
          style={({ pressed }) => [styles.activeOrder, pressed && styles.activeOrderPressed]}
          onPress={() => navigation.navigate("OrderDetails", { orderId: primaryActiveOrder.id })}
        >
          <View style={styles.activeOrderIcon}>
            <Ionicons name="bag-handle" size={iconSize.md} color={colors.primary} />
          </View>
          <View style={styles.activeOrderBody}>
            <Text style={styles.activeOrderKicker}>طلبك الجاري</Text>
            <Text style={styles.activeOrderName} numberOfLines={1}>
              {primaryActiveOrder.truck_name}
            </Text>
          </View>
          <View style={styles.activeOrderPill}>
            <Text style={styles.activeOrderPillText}>
              {statusLabel[primaryActiveOrder.status] ?? primaryActiveOrder.status}
            </Text>
          </View>
          <Ionicons name="chevron-back" size={iconSize.md} color={colors.textMuted} />
        </Pressable>
      ) : null}

      {/* ——— CATEGORIES ——— */}
      <ScrollView
        ref={categoriesRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catsContent}
        onContentSizeChange={snapToRight(categoriesRef)}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <Pressable
              key={cat.key}
              style={styles.catItem}
              onPress={() => setActiveCategory(cat.key)}
              hitSlop={6}
            >
              <View style={[styles.catCoin, isActive && styles.catCoinActive]}>
                <Ionicons
                  name={cat.icon}
                  size={22}
                  color={isActive ? colors.onPrimary : colors.brandBlue}
                />
              </View>
              <Text style={[styles.catLabel, isActive && styles.catLabelActive]}>{cat.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ——— PROMO ——— */}
      <Pressable style={styles.promo} onPress={() => navigation.navigate("Map")}>
        <LinearGradient
          colors={["#FFB703", "#FF8A2B", "#FF6B00"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.promoGradient}
        >
          <View style={styles.promoIcon}>
            <Ionicons name="map" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.promoText}>
            <Text style={styles.promoTitle}>استكشف على الخريطة</Text>
            <Text style={styles.promoSub}>مواقع التركات القريبة مباشرة</Text>
          </View>
          <Ionicons name="chevron-back" size={iconSize.md} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>

      {/* ——— FEATURED ——— */}
      {featuredTrucks.length > 0 ? (
        <View>
          <SectionHeader title="اخترنا لك" />
          <ScrollView
            ref={featuredRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredContent}
            onContentSizeChange={snapToRight(featuredRef)}
            decelerationRate="fast"
            snapToInterval={252}
          >
            {featuredTrucks.map((t) => (
              <FeaturedTruckCard
                key={`feat-${t.id}`}
                truck={t}
                distance={distanceForTruck(t)}
                onPress={() => navigateTruck(t)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* ——— NEARBY ——— */}
      <SectionHeader title="الأقرب إليك" trailing={`${orderedTrucks.length} ترك متاح الآن`} />

      {discoveryQuery.isLoading ? (
        <View style={styles.listInner}>
          <LoadingSkeleton rows={4} />
        </View>
      ) : null}
      {discoveryQuery.isError ? (
        <View style={styles.listInner}>
          <ErrorState
            message={getReadableNetworkError(discoveryQuery.error)}
            onRetry={() => void discoveryQuery.refetch()}
          />
        </View>
      ) : null}
      {!discoveryQuery.isLoading && !discoveryQuery.isError && orderedTrucks.length === 0 ? (
        <View style={styles.listInner}>
          <EmptyState
            title="لا توجد تركات"
            description="جرّب تغيير التصنيف أو الفلاتر، أو افتح الخريطة لاستكشاف المواقع."
            icon="restaurant-outline"
            actionLabel="تحديث القائمة"
            onAction={() => void discoveryQuery.refetch()}
            secondaryLabel="فتح الخريطة"
            onSecondary={() => navigation.navigate("Map")}
            variant="card"
          />
        </View>
      ) : null}
    </View>
  );

  const listFooter = (
    <View style={styles.listInner}>
      <SectionHeader title="طلباتك الحالية" />
      {!accessToken ? (
        <View style={styles.authCard}>
          <View style={styles.authBadge}>
            <Ionicons name="bag-handle" size={20} color={colors.onPrimary} />
          </View>
          <Text style={styles.authTitle}>تابع طلبك بكل سهولة</Text>
          <Text style={styles.authBody}>سجل دخولك لمتابعة حالة التحضير والاستلام مباشرة.</Text>
          <AppButton
            label="تسجيل الدخول"
            onPress={() => navigation.navigate("Auth")}
            variant="primary"
            size="lg"
            fullWidth
          />
        </View>
      ) : ordersQuery.isLoading ? (
        <LoadingSkeleton rows={2} />
      ) : ordersQuery.isError ? (
        <Text style={styles.muted}>{getReadableNetworkError(ordersQuery.error)}</Text>
      ) : currentOrders.length === 0 ? (
        <EmptyState
          title="لا طلب نشط حاليًا"
          description="اطلب من ترك قريب وستظهر حالة طلبك هنا فورًا."
          icon="receipt-outline"
          actionLabel="استكشف التركات"
          onAction={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
          secondaryLabel="فتح الخريطة"
          onSecondary={() => navigation.navigate("Map")}
          variant="card"
        />
      ) : (
        <View style={styles.ordersBlock}>
          {currentOrders.slice(0, 3).map((order) => (
            <OrderCard
              key={order.id}
              truckName={order.truck_name}
              orderNumber={order.order_number}
              statusLabel={statusLabel[order.status] ?? order.status}
              statusCode={order.status}
              eta={
                order.estimated_ready_minutes
                  ? `جاهز خلال ${order.estimated_ready_minutes.toLocaleString("ar-SA")} د`
                  : "قيد المعالجة"
              }
              isCurrent
              onPressDetails={() => navigation.navigate("OrderDetails", { orderId: order.id })}
            />
          ))}
          <AppButton
            label="تفاصيل الطلبات"
            onPress={() => navigation.navigate("Orders")}
            variant="ghost"
            fullWidth
          />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
      <AppContainer edges={[]}>
        <FlatList
          ref={listRef}
          data={listData}
          keyExtractor={(item) => `truck-${item.id}`}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={discoveryQuery.isFetching || ordersQuery.isFetching}
              onRefresh={() => void onRefresh()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.listInner}>
              <TruckCard truck={item} distanceLabel={distanceForTruck(item)} onPress={() => navigateTruck(item)} />
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </AppContainer>

      <FiltersBottomSheet
        visible={filterOpen}
        initialFilters={filters}
        onClose={() => setFilterOpen(false)}
        onApply={setFilters}
      />
    </View>
  );
};

// ============================================================
// Section Header
// ============================================================

const SectionHeader = ({
  title,
  trailing
}: {
  title: string;
  trailing?: string;
  /** @deprecated kept for backward-compat — all bars are orange now */
  accent?: "blue" | "orange";
}) => (
  <View style={styles.sectionHead}>
    <View style={styles.sectionHeadLeft}>
      <View style={styles.sectionBar} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {trailing ? <Text style={styles.sectionTrailing}>{trailing}</Text> : null}
  </View>
);

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg
  },
  listContent: {
    paddingBottom: 120
  },
  listInner: {
    paddingHorizontal: spacing.lg
  },

  // HERO
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl + spacing.xs,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: spacing.md
  },
  heroTopRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.lg
  },
  heroBell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  heroLocationPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    maxWidth: 240
  },
  heroLocationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF"
  },
  heroLocationText: {
    color: "#FFFFFF",
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "right"
  },
  heroGreeting: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "right",
    writingDirection: "rtl"
  },
  heroGreetingName: {
    color: "#FFF6DE"
  },
  heroSub: {
    marginTop: 4,
    color: "rgba(255, 255, 255, 0.82)",
    fontSize: typography.bodySm,
    textAlign: "right"
  },
  searchBar: {
    marginTop: spacing.md,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    paddingRight: 16,
    borderRadius: radius.pill,
    backgroundColor: "#FFFFFF",
    ...shadows.soft
  },
  searchInput: {
    flex: 1,
    minHeight: 36,
    color: colors.text,
    fontSize: typography.bodySm,
    fontWeight: "600",
    textAlign: "right",
    writingDirection: "rtl",
    paddingVertical: 0
  },
  searchFilter: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.cta
  },

  // ACTIVE ORDER
  activeOrder: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
    ...shadows.soft
  },
  activeOrderPressed: {
    opacity: 0.94
  },
  activeOrderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  activeOrderBody: {
    flex: 1
  },
  activeOrderKicker: {
    color: colors.primary,
    fontSize: typography.micro,
    fontWeight: "800",
    textAlign: "right"
  },
  activeOrderName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
    textAlign: "right"
  },
  activeOrderPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primary
  },
  activeOrderPillText: {
    color: "#FFFFFF",
    fontSize: typography.micro,
    fontWeight: "800"
  },

  // CATEGORIES
  catsContent: {
    paddingHorizontal: spacing.lg,
    gap: 14,
    flexDirection: "row-reverse",
    marginBottom: spacing.md
  },
  catItem: {
    alignItems: "center",
    gap: 6,
    width: 64
  },
  catCoin: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft
  },
  catCoinActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    ...shadows.cta
  },
  catLabel: {
    color: colors.textSecondary,
    fontSize: typography.micro,
    fontWeight: "700"
  },
  catLabelActive: {
    color: colors.primary,
    fontWeight: "800"
  },

  // PROMO
  promo: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadows.cta
  },
  promoGradient: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: 14
  },
  promoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center"
  },
  promoText: {
    flex: 1,
    alignItems: "flex-end",
    gap: 2
  },
  promoTitle: {
    color: "#FFFFFF",
    fontSize: typography.h3,
    fontWeight: "900",
    textAlign: "right"
  },
  promoSub: {
    color: "rgba(255, 255, 255, 0.92)",
    fontSize: typography.caption,
    textAlign: "right"
  },

  // FEATURED
  featuredContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    flexDirection: "row-reverse"
  },

  // SECTION HEAD
  sectionHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  sectionHeadLeft: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0
  },
  sectionBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: colors.primary
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: "800"
  },
  sectionTrailing: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "700"
  },

  // AUTH CARD
  authCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
    alignItems: "flex-end",
    ...shadows.soft
  },
  authBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.cta
  },
  authTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: typography.h2,
    textAlign: "right"
  },
  authBody: {
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    lineHeight: 20,
    textAlign: "right"
  },

  // MISC
  ordersBlock: {
    gap: spacing.sm
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.bodySm,
    marginBottom: spacing.md
  }
});
