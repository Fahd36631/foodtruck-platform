import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { AppButton, EmptyState, StatusBadge } from "@/ui";
import { useTruckDetails } from "@/features/trucks/hooks/use-truck-details";
import type { RootStackParamList } from "@/navigation/root-stack";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { colors, iconSize, radius, shadows, spacing, typography } from "@/theme/tokens";
import { resolveMediaUrl } from "@/utils/media-url";

type Props = NativeStackScreenProps<RootStackParamList, "TruckDetails">;

export const TruckDetailsScreen = ({ route, navigation }: Props) => {
  const { truckId } = route.params;
  const accessToken = useAuthStore((s) => s.accessToken) ?? "";
  const cartTruckId = useCartStore((s) => s.truckId);
  const cartItemCount = useCartStore((s) => s.itemCount);
  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const incrementItem = useCartStore((s) => s.incrementItem);
  const decrementItem = useCartStore((s) => s.decrementItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const canAddFromTruck = useCartStore((s) => s.canAddFromTruck);
  const { data, isLoading, isError, refetch, isRefetching } = useTruckDetails(truckId, accessToken);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const visibleMenuItems = useMemo(() => {
    if (!data?.menuItems) return [];
    return data.menuItems.filter((item) => Number(item.is_available) === 1);
  }, [data?.menuItems]);
  const quantityById = useMemo(() => {
    const map = new Map<number, number>();
    cartItems.forEach((item) => map.set(item.menuItemId, item.quantity));
    return map;
  }, [cartItems]);

  if (isLoading) {
    return (
      <View style={styles.centeredScreen}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>جاري تحميل تفاصيل الترك…</Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.centeredScreen}>
        <Text style={styles.errorText}>تعذر تحميل تفاصيل الترك الآن.</Text>
      </View>
    );
  }

  const ratingNum = Number(data.avg_rating);
  const hasRatings = (data.rating_count ?? 0) > 0 && Number.isFinite(ratingNum) && ratingNum > 0;

  const handleAdd = (item: (typeof data.menuItems)[number]) => {
    if (!canAddFromTruck(data.id)) {
      Alert.alert("تنبيه السلة", "يمكنك الطلب من ترك واحد فقط في كل مرة", [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تفريغ السلة والمتابعة",
          style: "destructive",
          onPress: () => {
            clearCart();
            addItem({
              truckId: data.id,
              truckName: data.display_name,
              menuItemId: item.id,
              name: item.name,
              price: Number(item.price),
              imageUrl: item.image_url
            });
          }
        }
      ]);
      return;
    }

    addItem({
      truckId: data.id,
      truckName: data.display_name,
      menuItemId: item.id,
      name: item.name,
      price: Number(item.price),
      imageUrl: item.image_url
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.primary} />
        }
      >
        <View style={styles.heroCard}>
        {resolveMediaUrl(data.cover_image_url) ? (
          <Image source={{ uri: resolveMediaUrl(data.cover_image_url) ?? "" }} style={styles.heroImage} resizeMode="cover" />
        ) : null}
        <View style={styles.heroTop}>
          <Text style={styles.name}>{data.display_name}</Text>
          <StatusBadge status={data.operational_status} />
        </View>
        <Text style={styles.location}>
          {data.neighborhood}, {data.city}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="star" size={iconSize.sm} color={hasRatings ? colors.warning : colors.textMuted} />
          {hasRatings ? (
            <>
              <Text style={styles.rating}>{ratingNum.toLocaleString("ar-SA", { maximumFractionDigits: 1 })}</Text>
              <Text style={styles.reviews}>({data.rating_count})</Text>
            </>
          ) : (
            <Text style={styles.noRating}>بدون تقييمات بعد</Text>
          )}
        </View>
        {data.description ? <Text style={styles.description}>{data.description}</Text> : null}
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuTitle}>المنيو</Text>
          {visibleMenuItems.length === 0 ? (
            <EmptyState
              title="لا أصناف متاحة حاليًا"
              description="قد يكون صاحب الترك حدّث القائمة. اسحب للتحديث أو أعد فتح الصفحة."
              icon="fast-food-outline"
              actionLabel="تحديث"
              onAction={() => void refetch()}
              variant="card"
            />
          ) : (
            <View style={styles.menuList}>
              {visibleMenuItems.map((item) => {
                const quantity = quantityById.get(item.id) ?? 0;
                return (
                  <View key={item.id} style={styles.menuItemCard}>
                    {resolveMediaUrl(item.image_url) ? (
                      <Image source={{ uri: resolveMediaUrl(item.image_url) ?? "" }} style={styles.menuItemImage} resizeMode="cover" />
                    ) : null}
                    <View style={styles.menuItemHeader}>
                      <Text style={styles.menuItemName}>{item.name}</Text>
                      <Text style={styles.menuPrice}>
                        {Number(item.price).toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ر.س
                      </Text>
                    </View>
                    {item.description ? <Text style={styles.menuDesc}>{item.description}</Text> : null}

                    {quantity > 0 ? (
                      <View style={styles.stepperRow}>
                        <Pressable style={styles.stepperBtn} onPress={() => incrementItem(item.id)}>
                          <Ionicons name="add" size={18} color={colors.primaryDark} />
                        </Pressable>
                        <Text style={styles.stepperQty}>{quantity.toLocaleString("ar-SA")}</Text>
                        <Pressable style={styles.stepperBtn} onPress={() => decrementItem(item.id)}>
                          <Ionicons name="remove" size={18} color={colors.primaryDark} />
                        </Pressable>
                        <AppButton label="إضافة" onPress={() => handleAdd(item)} variant="ghost" size="sm" style={styles.addMoreBtn} />
                      </View>
                    ) : (
                      <AppButton label="إضافة" icon="add" onPress={() => handleAdd(item)} variant="primary" size="sm" style={styles.addBtn} />
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
      {cartItemCount > 0 ? (
        <View style={styles.stickyCartWrap}>
          <AppButton
            label={`عرض السلة (${cartItemCount.toLocaleString("ar-SA")})`}
            onPress={() => navigation.navigate("Cart")}
            variant="primary"
            fullWidth
          />
        </View>
      ) : null}
      {cartTruckId !== null && cartTruckId !== data.id ? (
        <View style={styles.crossTruckHint}>
          <Text style={styles.crossTruckHintText}>السلة الحالية مرتبطة بترك آخر. يمكنك تفريغها للبدء من هذا الترك.</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg
  },
  content: {
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: 160,
    gap: spacing.md
  },
  centeredScreen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary
  },
  errorText: {
    color: colors.danger,
    textAlign: "center",
    fontSize: typography.body
  },
  heroCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...shadows.soft
  },
  heroImage: {
    width: "100%",
    height: 180,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.bgDeep
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: typography.h1,
    fontWeight: "800"
  },
  location: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.bodySm
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.sm
  },
  rating: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.bodySm
  },
  reviews: {
    color: colors.textMuted,
    fontSize: typography.caption
  },
  noRating: {
    color: colors.textMuted,
    fontSize: typography.bodySm,
    fontWeight: "600"
  },
  description: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    lineHeight: 22,
    fontSize: typography.bodySm
  },
  menuSection: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...shadows.soft
  },
  menuTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.h2
  },
  menuList: {
    marginTop: spacing.sm,
    gap: spacing.sm
  },
  menuItemCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    padding: spacing.sm
  },
  menuItemImage: {
    width: "100%",
    height: 140,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.bgDeep
  },
  menuItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  },
  menuItemName: {
    flex: 1,
    color: colors.text,
    fontWeight: "700",
    fontSize: typography.body
  },
  menuPrice: {
    color: colors.primaryDark,
    fontWeight: "800",
    fontSize: typography.bodySm
  },
  menuDesc: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.bodySm
  },
  addBtn: {
    marginTop: spacing.sm
  },
  stepperRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center"
  },
  stepperQty: {
    minWidth: 28,
    textAlign: "center",
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.bodySm
  },
  addMoreBtn: {
    marginStart: "auto"
  },
  stickyCartWrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg
  },
  crossTruckHint: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: 86,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.warningMuted,
    padding: spacing.xs
  },
  crossTruckHintText: {
    color: colors.text,
    fontSize: typography.caption,
    textAlign: "center"
  }
});
