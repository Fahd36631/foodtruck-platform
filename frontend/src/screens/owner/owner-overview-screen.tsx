import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import type { MapPressEvent } from "react-native-maps";

import { AppButton, AppContainer, CustomerMapView, EmptyState, LoadingSkeleton, Marker, StatusBadge } from "@/ui";
import {
  getMyOwnerNotifications,
  getMyOwnerTruckDraft,
  getMyOwnerTrucks,
  uploadSingleFile,
  updateOwnerTruckLocation,
  updateOwnerTruckProfile,
  updateOwnerTruckStatus
} from "@/features/trucks/api";
import { getIncomingOwnerOrders } from "@/features/orders/api";
import {
  createOwnerMenuItem,
  deleteOwnerMenuItem,
  getMenuCategories,
  getOwnerMenuItems,
  updateOwnerMenuItem
} from "@/features/menus/api";
import { getReadableNetworkError } from "@/api/network-error";
import { useAuthStore } from "@/store/auth-store";
import type { RootStackParamList } from "@/navigation/root-stack";
import { colors, iconSize, radius, shadows, spacing, typography } from "@/theme/tokens";
import { resolveMediaUrl } from "@/utils/media-url";

export const OwnerOverviewScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken) ?? "";
  const roleCode = useAuthStore((s) => s.user?.roleCode);
  const fullName = useAuthStore((s) => s.user?.fullName) ?? "صاحب الترك";
  const [activationVisible, setActivationVisible] = useState(false);
  const [activationError, setActivationError] = useState("");
  const [todayWorkingHours, setTodayWorkingHours] = useState("");
  const [todayCity, setTodayCity] = useState("");
  const [todayNeighborhood, setTodayNeighborhood] = useState("");
  const [todayCoords, setTodayCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [openAfterActivation, setOpenAfterActivation] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [editingMenuItemId, setEditingMenuItemId] = useState<number | null>(null);
  const [menuName, setMenuName] = useState("");
  const [menuDescription, setMenuDescription] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuCategoryId, setMenuCategoryId] = useState<number | null>(null);
  const [menuImageUrl, setMenuImageUrl] = useState("");
  const [menuImageName, setMenuImageName] = useState("");
  const [menuImageMimeType, setMenuImageMimeType] = useState<string | undefined>();
  const [menuError, setMenuError] = useState("");
  const hasCheckedActivationOnThisLogin = useRef(false);

  const ownerTrucksQuery = useQuery({
    queryKey: ["owner-my-trucks", accessToken],
    queryFn: () => getMyOwnerTrucks(accessToken),
    enabled: !!accessToken && roleCode === "truck_owner"
  });
  const ownerDraftQuery = useQuery({
    queryKey: ["owner-truck-draft", accessToken],
    queryFn: () => getMyOwnerTruckDraft(accessToken),
    enabled: !!accessToken && roleCode === "truck_owner"
  });
  const ownerNotificationsQuery = useQuery({
    queryKey: ["owner-notifications", accessToken],
    queryFn: () => getMyOwnerNotifications(accessToken),
    enabled: !!accessToken && roleCode === "truck_owner"
  });
  const hasApprovedTruck = (ownerTrucksQuery.data ?? []).some((truck) => truck.approval_status === "approved");

  const incomingOrders = useQuery({
    queryKey: ["owner-overview-orders", accessToken],
    queryFn: () => getIncomingOwnerOrders(accessToken),
    enabled: !!accessToken && roleCode === "truck_owner" && hasApprovedTruck
  });
  const ownerMenuItemsQuery = useQuery({
    queryKey: ["owner-menu-items", accessToken, ownerTrucksQuery.data?.[0]?.id],
    queryFn: () => getOwnerMenuItems(ownerTrucksQuery.data?.[0]?.id ?? 0, accessToken),
    enabled: !!accessToken && !!ownerTrucksQuery.data?.[0]?.id && hasApprovedTruck
  });
  const menuCategoriesQuery = useQuery({
    queryKey: ["menu-categories", accessToken],
    queryFn: () => getMenuCategories(accessToken),
    enabled: !!accessToken && hasApprovedTruck
  });

  const activationMutation = useMutation({
    mutationFn: async () => {
      const activeTruck = (ownerTrucksQuery.data ?? [])[0];
      if (!activeTruck || !todayCoords) {
        throw new Error("missing-activation-data");
      }

      await updateOwnerTruckProfile(activeTruck.id, { workingHours: todayWorkingHours.trim() }, accessToken);
      await updateOwnerTruckLocation(
        activeTruck.id,
        {
          latitude: todayCoords.latitude,
          longitude: todayCoords.longitude,
          city: todayCity.trim(),
          neighborhood: todayNeighborhood.trim()
        },
        accessToken
      );
      if (openAfterActivation && activeTruck.operational_status !== "open") {
        await updateOwnerTruckStatus(activeTruck.id, "open", accessToken);
      }
    },
    onSuccess: async () => {
      setActivationVisible(false);
      setActivationError("");
      setOpenAfterActivation(false);
      await queryClient.invalidateQueries({ queryKey: ["owner-my-trucks"] });
      await queryClient.invalidateQueries({ queryKey: ["owner-truck-draft"] });
    },
    onError: (error) => {
      setActivationError(getReadableNetworkError(error));
    }
  });
  const toggleStatusMutation = useMutation({
    mutationFn: async () => {
      const activeTruck = (ownerTrucksQuery.data ?? [])[0];
      if (!activeTruck) {
        throw new Error("truck-not-found");
      }
      const nextStatus = activeTruck.operational_status === "open" ? "closed" : "open";
      if (nextStatus === "open") {
        setActivationError("");
        setOpenAfterActivation(true);
        setActivationVisible(true);
        return;
      }
      await updateOwnerTruckStatus(activeTruck.id, nextStatus, accessToken);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner-my-trucks"] });
      await queryClient.invalidateQueries({ queryKey: ["owner-overview-orders"] });
    },
    onError: (error) => {
      setActivationError(getReadableNetworkError(error));
    }
  });
  const upsertMenuItemMutation = useMutation({
    mutationFn: async () => {
      const activeTruck = (ownerTrucksQuery.data ?? [])[0];
      if (!activeTruck || !menuCategoryId) {
        throw new Error("menu-invalid-data");
      }
      const payload = {
        truckId: activeTruck.id,
        categoryId: menuCategoryId,
        name: menuName.trim(),
        description: menuDescription.trim() || undefined,
        price: Number(menuPrice),
        imageUrl: undefined as string | undefined,
        isAvailable: true
      };
      if (menuImageUrl.trim()) {
        payload.imageUrl = menuImageUrl.trim().startsWith("http")
          ? menuImageUrl.trim()
          : (
              await uploadSingleFile(
                {
                  uri: menuImageUrl.trim(),
                  fileName: menuImageName || undefined,
                  mimeType: menuImageMimeType
                },
                accessToken
              )
            ).url;
      }

      if (editingMenuItemId) {
        await updateOwnerMenuItem(editingMenuItemId, payload, accessToken);
      } else {
        await createOwnerMenuItem(payload, accessToken);
      }
    },
    onSuccess: async () => {
      setMenuModalVisible(false);
      setEditingMenuItemId(null);
      setMenuName("");
      setMenuDescription("");
      setMenuPrice("");
      setMenuCategoryId(null);
      setMenuImageUrl("");
      setMenuImageName("");
      setMenuImageMimeType(undefined);
      setMenuError("");
      const tid = ownerTrucksQuery.data?.[0]?.id;
      await queryClient.invalidateQueries({ queryKey: ["owner-menu-items"] });
      await queryClient.invalidateQueries({ queryKey: ["trucks-discovery"] });
      if (tid) {
        await queryClient.invalidateQueries({ queryKey: ["truck-details", tid] });
      }
    },
    onError: (error) => {
      setMenuError(getReadableNetworkError(error));
    }
  });
  const deleteMenuItemMutation = useMutation({
    mutationFn: (menuItemId: number) => deleteOwnerMenuItem(menuItemId, accessToken),
    onSuccess: async () => {
      const tid = ownerTrucksQuery.data?.[0]?.id;
      await queryClient.invalidateQueries({ queryKey: ["owner-menu-items"] });
      await queryClient.invalidateQueries({ queryKey: ["trucks-discovery"] });
      if (tid) {
        await queryClient.invalidateQueries({ queryKey: ["truck-details", tid] });
      }
    }
  });

  const toggleMenuAvailabilityMutation = useMutation({
    mutationFn: ({ menuItemId, isAvailable }: { menuItemId: number; isAvailable: boolean }) =>
      updateOwnerMenuItem(menuItemId, { isAvailable }, accessToken),
    onSuccess: async () => {
      const tid = ownerTrucksQuery.data?.[0]?.id;
      await queryClient.invalidateQueries({ queryKey: ["owner-menu-items"] });
      await queryClient.invalidateQueries({ queryKey: ["trucks-discovery"] });
      if (tid) {
        await queryClient.invalidateQueries({ queryKey: ["truck-details", tid] });
      }
    }
  });

  useEffect(() => {
    if (hasCheckedActivationOnThisLogin.current) {
      return;
    }

    const activeTruck = (ownerTrucksQuery.data ?? [])[0];
    const draft = ownerDraftQuery.data;

    if (!activeTruck || activeTruck.approval_status !== "approved" || !draft) {
      return;
    }

    const capturedAt = draft.captured_at ? new Date(draft.captured_at) : null;
    const isTodayLocation =
      capturedAt !== null &&
      capturedAt.getFullYear() === new Date().getFullYear() &&
      capturedAt.getMonth() === new Date().getMonth() &&
      capturedAt.getDate() === new Date().getDate();
    const hasWorkingHours = Boolean(draft.working_hours?.trim());

    if (!isTodayLocation || !hasWorkingHours) {
      setTodayWorkingHours(draft.working_hours ?? "");
      setTodayCity(draft.city ?? "");
      setTodayNeighborhood(draft.neighborhood ?? "");
      if (typeof draft.latitude === "number" && typeof draft.longitude === "number") {
        setTodayCoords({ latitude: draft.latitude, longitude: draft.longitude });
      }
      setOpenAfterActivation(false);
      setActivationVisible(true);
    }

    // Show activation modal once per login session only.
    hasCheckedActivationOnThisLogin.current = true;
  }, [ownerDraftQuery.data, ownerTrucksQuery.data]);

  const useCurrentLocation = async () => {
    setActivationError("");
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setActivationError("لازم تسمح بالوصول للموقع لتفعيل موقع اليوم.");
      return;
    }

    const current = await Location.getCurrentPositionAsync({});
    setTodayCoords({ latitude: current.coords.latitude, longitude: current.coords.longitude });
  };

  const onActivationMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setTodayCoords({ latitude, longitude });
  };

  const openCreateMenuModal = () => {
    setEditingMenuItemId(null);
    setMenuName("");
    setMenuDescription("");
    setMenuPrice("");
    setMenuCategoryId(menuCategoriesQuery.data?.[0]?.id ?? null);
    setMenuImageUrl("");
    setMenuImageName("");
    setMenuImageMimeType(undefined);
    setMenuError("");
    setMenuModalVisible(true);
  };

  const pickMenuImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMenuError("يرجى السماح بالوصول للصور لاختيار صورة المنتج.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setMenuImageUrl(result.assets[0].uri);
      setMenuImageName(result.assets[0].fileName ?? "");
      setMenuImageMimeType(result.assets[0].mimeType ?? undefined);
      setMenuError("");
    }
  };

  const metrics = useMemo(() => {
    const items = incomingOrders.data ?? [];
    return {
      total: items.length,
      pending: items.filter((o) => o.status === "pending").length,
      preparing: items.filter((o) => o.status === "preparing").length,
      ready: items.filter((o) => o.status === "ready").length
    };
  }, [incomingOrders.data]);

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    (menuCategoriesQuery.data ?? []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [menuCategoriesQuery.data]);

  const refreshingOverview =
    ownerTrucksQuery.isFetching ||
    ownerDraftQuery.isFetching ||
    incomingOrders.isFetching ||
    ownerMenuItemsQuery.isFetching;

  const onRefreshOverview = useCallback(() => {
    void Promise.all([
      ownerTrucksQuery.refetch(),
      ownerDraftQuery.refetch(),
      incomingOrders.refetch(),
      ownerMenuItemsQuery.refetch(),
      menuCategoriesQuery.refetch(),
      ownerNotificationsQuery.refetch()
    ]);
  }, [ownerTrucksQuery, ownerDraftQuery, incomingOrders, ownerMenuItemsQuery, menuCategoriesQuery, ownerNotificationsQuery]);
  const currentTruckStatus = ownerTrucksQuery.data?.[0]?.approval_status ?? null;
  const isTruckApproved = currentTruckStatus === "approved";
  const pendingRequest =
    menuCategoriesQuery.isLoading || upsertMenuItemMutation.isPending || deleteMenuItemMutation.isPending || toggleMenuAvailabilityMutation.isPending;
  const canAddProduct = hasApprovedTruck && isTruckApproved && !menuCategoriesQuery.isLoading && !menuCategoriesQuery.isError && (menuCategoriesQuery.data ?? []).length > 0;
  const addProductBlockedReason = !hasApprovedTruck || !isTruckApproved
    ? "لا يمكنك إضافة منتج الآن حتى يتم اعتماد الترك."
    : pendingRequest
      ? "يرجى الانتظار حتى يكتمل التحديث الحالي ثم أعد المحاولة."
      : menuCategoriesQuery.isError
        ? "تعذر تحميل تصنيفات المنيو الآن. حاول مرة أخرى بعد قليل."
        : (menuCategoriesQuery.data ?? []).length === 0
          ? "لا توجد تصنيفات متاحة حاليًا لإضافة منتج."
          : null;
  const isAddProductDisabled = !canAddProduct;
  const name = menuName;
  const description = menuDescription;
  const price = menuPrice;
  const isDisabled = !name?.trim() || !price;

  if (!accessToken || roleCode !== "truck_owner") {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.pad}>
          <Text style={styles.pageTitle}>لوحة التشغيل</Text>
          <Text style={styles.pageSub}>هذه الواجهة مخصصة لحساب صاحب الترك فقط.</Text>
        </View>
      </AppContainer>
    );
  }

  if (ownerTrucksQuery.isLoading) {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.pad}>
          <Text style={styles.pageTitle}>لوحة التشغيل</Text>
          <LoadingSkeleton rows={6} />
        </View>
      </AppContainer>
    );
  }

  if (ownerTrucksQuery.isError) {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.pad}>
          <Text style={styles.pageTitle}>لوحة التشغيل</Text>
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{getReadableNetworkError(ownerTrucksQuery.error)}</Text>
            <AppButton label="إعادة المحاولة" onPress={() => void ownerTrucksQuery.refetch()} variant="primary" fullWidth />
          </View>
        </View>
      </AppContainer>
    );
  }

  const ownerTrucks = ownerTrucksQuery.data ?? [];
  const activeTruck = ownerTrucks[0];
  const latestAdminNotification = (ownerNotificationsQuery.data ?? [])[0];

  if (!activeTruck) {
    return (
      <AppContainer edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.pageTitle}>لوحة التشغيل</Text>
          <View style={styles.noticeCard}>
            <View style={styles.noticeIconWrap}>
              <Ionicons name="restaurant-outline" size={iconSize.xl} color={colors.primary} />
            </View>
            <Text style={styles.noticeTitle}>أكمل بيانات الترك</Text>
            <Text style={styles.noticeText}>
              لاستقبال الطلبات، سجّل تركك وارفع الرخصة والموقع. بعد الموافقة ستظهر لوحة التشغيل كاملة.
            </Text>
            <AppButton
              label="إكمال بيانات الترك"
              onPress={() => navigation.navigate("OwnerOnboarding", { flow: "register" })}
              variant="primary"
              fullWidth
            />
          </View>
        </ScrollView>
      </AppContainer>
    );
  }

  if (activeTruck.approval_status !== "approved") {
    return (
      <AppContainer edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCardLight}>
            <Text style={styles.eyebrow}>حالة التسجيل</Text>
            <Text style={styles.pageTitle}>مرحبًا {fullName}</Text>
            <Text style={styles.pageSub}>يمكنك متابعة حالة الترك من هنا أو من تبويب الحساب.</Text>
          </View>
          {latestAdminNotification ? (
            <View style={styles.adminNoteCard}>
              <Ionicons name="notifications-outline" size={iconSize.md} color={colors.warning} />
              <View style={styles.notificationTextWrap}>
                <Text style={styles.notificationTitle}>{latestAdminNotification.title}</Text>
                <Text style={styles.notificationBody}>{latestAdminNotification.body}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.statusCardLight}>
            <View style={[styles.approvalPill, activeTruck.approval_status === "pending" ? styles.approvalPending : styles.approvalRejected]}>
              <Text style={styles.approvalPillText}>
                {activeTruck.approval_status === "pending" ? "بانتظار المراجعة" : "يحتاج تعديل"}
              </Text>
            </View>
            <Text style={styles.truckTitle}>{activeTruck.display_name}</Text>
            <Text style={styles.mutedLine}>رقم التسجيل: #{activeTruck.id}</Text>
            <Text style={styles.mutedLine}>تاريخ التقديم: {new Date(activeTruck.created_at).toLocaleDateString("ar-SA")}</Text>
            {activeTruck.approval_status === "rejected" ? (
              <View style={styles.rejectionBox}>
                <Text style={styles.rejectionTitle}>سبب الرفض</Text>
                <Text style={styles.rejectionBody}>{activeTruck.review_note?.trim() || "لم يتم إدخال سبب من الإدارة."}</Text>
              </View>
            ) : null}

            <AppButton label="تحديث الحالة" onPress={() => void ownerTrucksQuery.refetch()} variant="secondary" fullWidth />

            {activeTruck.approval_status === "rejected" ? (
              <AppButton
                label="تعديل البيانات وإعادة الإرسال"
                onPress={() => navigation.navigate("OwnerOnboarding", { flow: "update" })}
                variant="primary"
                fullWidth
              />
            ) : null}
          </View>
        </ScrollView>
      </AppContainer>
    );
  }

  if (incomingOrders.isLoading) {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.pad}>
          <Text style={styles.pageTitle}>لوحة التشغيل</Text>
          <LoadingSkeleton rows={6} />
        </View>
      </AppContainer>
    );
  }

  if (incomingOrders.isError) {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.pad}>
          <Text style={styles.pageTitle}>لوحة التشغيل</Text>
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{getReadableNetworkError(incomingOrders.error)}</Text>
            <AppButton label="إعادة المحاولة" onPress={() => void incomingOrders.refetch()} variant="primary" fullWidth />
          </View>
        </View>
      </AppContainer>
    );
  }

  return (
    <AppContainer edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshingOverview} onRefresh={onRefreshOverview} tintColor={colors.primary} />
        }
      >
        <View style={styles.topCard}>
          <Text style={styles.eyebrow}>تشغيل اليوم</Text>
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.truckDisplayName} numberOfLines={2}>
                {activeTruck.display_name}
              </Text>
              <Text style={styles.ownerGreeting}>مرحبًا {fullName}</Text>
            </View>
            <AppButton
              label={activeTruck.operational_status === "open" ? "إيقاف اليوم" : "تشغيل اليوم"}
              variant={activeTruck.operational_status === "open" ? "secondary" : "primary"}
              onPress={() => toggleStatusMutation.mutate()}
              loading={toggleStatusMutation.isPending}
              style={styles.statusToggleButton}
            />
          </View>
          <View style={styles.badgeRow}>
            <StatusBadge status={activeTruck.operational_status} />
            <Text style={styles.approvedHint}>معتمد من الإدارة</Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard label="إجمالي الوارد" value={metrics.total} icon="pulse-outline" />
          <MetricCard label="طلبات جديدة" value={metrics.pending} icon="time-outline" />
          <MetricCard label="قيد التحضير" value={metrics.preparing} icon="flame-outline" />
          <MetricCard label="جاهزة للاستلام" value={metrics.ready} icon="checkmark-done-outline" />
        </View>

        <View style={styles.hintCard}>
          <Ionicons name="information-circle-outline" size={iconSize.md} color={colors.primary} />
          <Text style={styles.hintText}>انتقل إلى «طلبات الوارد» لتحديث حالات الطلبات والاستلام من موقع الترك.</Text>
        </View>

        <View style={styles.menuSection}>
          <View style={styles.menuSectionHeader}>
            <View>
              <Text style={styles.sectionHeading}>إدارة المنتجات</Text>
              <Text style={styles.sectionSub}>أضف الأصناف وحدّث الأسعار والتوفر للزبائن.</Text>
            </View>
          </View>
          <View style={styles.addProductButtonWrap}>
            <AppButton
              label="إضافة منتج جديد"
              icon="add"
              onPress={() => {
                if (addProductBlockedReason) {
                  Alert.alert("تنبيه", addProductBlockedReason, [{ text: "حسنًا" }]);
                  return;
                }
                openCreateMenuModal();
              }}
              disabled={isAddProductDisabled}
              variant="primary"
              size="lg"
              fullWidth
            />
          </View>
          {(ownerMenuItemsQuery.data ?? []).length === 0 ? (
            <View style={styles.menuEmpty}>
              <EmptyState
                title="لا منتجات بعد"
                description="استخدم الزر أعلاه لإضافة أول صنف ليظهر في منيو الترك للزبائن."
                icon="restaurant-outline"
                variant="card"
              />
            </View>
          ) : null}
          {(ownerMenuItemsQuery.data ?? []).map((item) => (
            <View key={item.id} style={styles.menuCard}>
              <View style={styles.menuCardTop}>
                <View style={styles.menuCardBody}>
                  <View style={styles.menuTitleRow}>
                    <Text style={styles.menuItemName}>{item.name}</Text>
                    <View style={[styles.availPill, item.is_available ? styles.availOn : styles.availOff]}>
                      <Text style={styles.availPillText}>{item.is_available ? "متاح" : "غير متاح"}</Text>
                    </View>
                  </View>
                  <Text style={styles.menuCategoryLine}>{categoryNameById.get(item.category_id) ?? "تصنيف"}</Text>
                  <Text style={styles.menuItemPrice}>{Number(item.price).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</Text>
                  <Text style={styles.menuItemDesc} numberOfLines={2}>
                    {item.description ?? "بدون وصف"}
                  </Text>
                </View>
                {resolveMediaUrl(item.image_url) ? (
                  <Image source={{ uri: resolveMediaUrl(item.image_url) ?? "" }} style={styles.menuItemImage} />
                ) : null}
              </View>
              <View style={styles.menuCardActions}>
                <AppButton
                  label={item.is_available ? "إخفاء من المنيو" : "تفعيل في المنيو"}
                  variant="ghost"
                  size="sm"
                  onPress={() => toggleMenuAvailabilityMutation.mutate({ menuItemId: item.id, isAvailable: !item.is_available })}
                  disabled={toggleMenuAvailabilityMutation.isPending}
                  style={styles.inlineActionButton}
                />
                <AppButton
                  label="تعديل"
                  variant="secondary"
                  size="sm"
                  onPress={() => {
                    setEditingMenuItemId(item.id);
                    setMenuName(item.name);
                    setMenuDescription(item.description ?? "");
                    setMenuPrice(String(item.price));
                    setMenuCategoryId(item.category_id);
                    setMenuImageUrl(item.image_url ?? "");
                    setMenuImageName("");
                    setMenuImageMimeType(undefined);
                    setMenuError("");
                    setMenuModalVisible(true);
                  }}
                  style={styles.inlineActionButton}
                />
                <AppButton
                  label="حذف"
                  variant="danger"
                  size="sm"
                  onPress={() => deleteMenuItemMutation.mutate(item.id)}
                  style={styles.inlineActionButton}
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={activationVisible} transparent animationType="slide" onRequestClose={() => {}}>
        <View style={styles.activationBackdrop}>
          <KeyboardAvoidingView
            style={styles.activationKeyboardAvoid}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={24}
          >
            <View style={styles.activationCard}>
              <ScrollView contentContainerStyle={styles.activationContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.activationTitle}>تفعيل تشغيل اليوم</Text>
                <Text style={styles.activationSubtitle}>قبل بدء اليوم، حدّد موقعك الحالي وساعات العمل لليوم.</Text>

                <TextInput
                  style={styles.activationInput}
                  placeholder="ساعات العمل اليوم (مثال: 4م - 12ص)"
                  placeholderTextColor={colors.textMuted}
                  value={todayWorkingHours}
                  onChangeText={setTodayWorkingHours}
                />
                <TextInput
                  style={styles.activationInput}
                  placeholder="المدينة"
                  placeholderTextColor={colors.textMuted}
                  value={todayCity}
                  onChangeText={setTodayCity}
                />
                <TextInput
                  style={styles.activationInput}
                  placeholder="الحي"
                  placeholderTextColor={colors.textMuted}
                  value={todayNeighborhood}
                  onChangeText={setTodayNeighborhood}
                />

                <Pressable style={styles.geoButton} onPress={useCurrentLocation}>
                  <Ionicons name="locate-outline" size={16} color={colors.primaryDark} />
                  <Text style={styles.geoButtonText}>
                    {todayCoords
                      ? `${todayCoords.latitude.toFixed(5)}, ${todayCoords.longitude.toFixed(5)}`
                      : "استخدام موقعي الحالي"}
                  </Text>
                </Pressable>
                <Text style={styles.mapHelperText}>تقدر تضغط على الخريطة لتغيير الموقع يدويًا.</Text>
                <CustomerMapView
                  style={styles.activationMap}
                  initialRegion={{
                    latitude: todayCoords?.latitude ?? 24.7136,
                    longitude: todayCoords?.longitude ?? 46.6753,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02
                  }}
                  onPress={onActivationMapPress}
                  userInterfaceStyle="light"
                >
                  {todayCoords ? <Marker coordinate={todayCoords} /> : null}
                </CustomerMapView>

                {activationError ? <Text style={styles.activationError}>{activationError}</Text> : null}

                <AppButton
                  label="تأكيد تشغيل اليوم"
                  variant="primary"
                  fullWidth
                  disabled={!todayWorkingHours.trim() || !todayCity.trim() || !todayNeighborhood.trim() || !todayCoords || activationMutation.isPending}
                  loading={activationMutation.isPending}
                  onPress={() => activationMutation.mutate()}
                />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={menuModalVisible} transparent animationType="slide" onRequestClose={() => setMenuModalVisible(false)}>
        <View style={styles.activationBackdrop}>
          <KeyboardAvoidingView
            style={styles.activationKeyboardAvoid}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={24}
          >
            <View style={styles.activationCard}>
              <ScrollView contentContainerStyle={styles.activationContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.activationTitle}>{editingMenuItemId ? "تعديل منتج" : "إضافة منتج جديد"}</Text>
                <TextInput
                  style={styles.activationInput}
                  placeholder="اسم المنتج"
                  placeholderTextColor={colors.textMuted}
                  value={menuName}
                  onChangeText={setMenuName}
                />
                <TextInput
                  style={styles.activationInput}
                  placeholder="وصف المنتج"
                  placeholderTextColor={colors.textMuted}
                  value={menuDescription}
                  onChangeText={setMenuDescription}
                />
                <TextInput
                  style={styles.activationInput}
                  placeholder="السعر"
                  placeholderTextColor={colors.textMuted}
                  value={menuPrice}
                  onChangeText={setMenuPrice}
                  keyboardType="decimal-pad"
                />
                <Pressable style={styles.geoButton} onPress={pickMenuImage}>
                  <Ionicons name="image-outline" size={16} color={colors.primaryDark} />
                  <Text style={styles.geoButtonText}>{menuImageUrl ? "تم اختيار صورة المنتج" : "إرفاق صورة المنتج من الجهاز"}</Text>
                </Pressable>
                {menuImageUrl ? (
                  <Image
                    source={{ uri: menuImageUrl }}
                    style={styles.menuModalImagePreview}
                    resizeMode="cover"
                  />
                ) : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {(menuCategoriesQuery.data ?? []).map((category) => (
                    <Pressable
                      key={category.id}
                      style={[styles.categoryChip, menuCategoryId === category.id && styles.categoryChipActive]}
                      onPress={() => setMenuCategoryId(category.id)}
                    >
                      <Text style={styles.categoryChipText}>{category.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {menuError ? <Text style={styles.activationError}>{menuError}</Text> : null}
                <View style={[styles.row, styles.modalButtonsRow]}>
                  <View style={styles.modalActionItem}>
                    <AppButton label="إلغاء" onPress={() => setMenuModalVisible(false)} variant="secondary" fullWidth />
                  </View>
                  <View style={styles.modalActionItem}>
                    <AppButton
                      label={editingMenuItemId ? "حفظ التعديل" : "إضافة"}
                      onPress={() => upsertMenuItemMutation.mutate()}
                      variant="primary"
                      fullWidth
                      disabled={isDisabled}
                      loading={upsertMenuItemMutation.isPending}
                    />
                  </View>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </AppContainer>
  );
};

const MetricCard = ({ label, value, icon }: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap }) => {
  return (
    <View style={styles.metricCard}>
      <Ionicons name={icon} size={iconSize.md} color={colors.primary} />
      <Text style={styles.metricValue}>{value.toLocaleString("ar-SA")}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pad: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120
  },
  pageTitle: {
    color: colors.brandBlue,
    letterSpacing: 0.2,
    fontSize: typography.h1,
    fontWeight: "800"
  },
  pageSub: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    lineHeight: 22
  },
  errorBanner: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
    ...shadows.soft
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.bodySm,
    lineHeight: 22
  },
  noticeCard: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: "center",
    ...shadows.soft
  },
  noticeIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.section,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  noticeTitle: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: "800",
    textAlign: "center"
  },
  noticeText: {
    color: colors.textSecondary,
    lineHeight: 22,
    fontSize: typography.bodySm,
    textAlign: "center"
  },
  heroCardLight: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
    ...shadows.soft
  },
  adminNoteCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.warningMuted,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  notificationTextWrap: {
    flex: 1,
    gap: 4
  },
  notificationTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.bodySm
  },
  notificationBody: {
    color: colors.textSecondary,
    lineHeight: 20,
    fontSize: typography.caption
  },
  statusCardLight: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.soft
  },
  approvalPill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  approvalPending: {
    backgroundColor: colors.warningMuted,
    borderWidth: 1,
    borderColor: "rgba(255, 183, 3, 0.45)"
  },
  approvalRejected: {
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: "rgba(230, 57, 70, 0.35)"
  },
  approvalPillText: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.caption
  },
  truckTitle: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: "800"
  },
  mutedLine: {
    color: colors.textMuted,
    fontSize: typography.caption
  },
  rejectionBox: {
    marginTop: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(230, 57, 70, 0.35)",
    backgroundColor: colors.dangerMuted,
    padding: spacing.md,
    gap: 4
  },
  rejectionTitle: {
    color: colors.danger,
    fontWeight: "800",
    fontSize: typography.caption
  },
  rejectionBody: {
    color: colors.textSecondary,
    lineHeight: 20,
    fontSize: typography.bodySm
  },
  eyebrow: {
    color: colors.primaryDark,
    fontWeight: "800",
    fontSize: typography.caption
  },
  topCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
    ...shadows.soft
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  titleBlock: {
    flex: 1,
    minWidth: 0
  },
  truckDisplayName: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: "800"
  },
  ownerGreeting: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: typography.bodySm
  },
  statusToggleButton: {
    minWidth: 118
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  approvedHint: {
    color: colors.textMuted,
    fontSize: typography.micro,
    fontWeight: "600"
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing.sm
  },
  metricCard: {
    width: "48.5%",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    ...shadows.soft
  },
  metricValue: {
    color: colors.text,
    fontSize: typography.h1,
    fontWeight: "800"
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: "600"
  },
  hintCard: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.section,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  hintText: {
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 22,
    fontSize: typography.bodySm
  },
  menuSection: {
    marginTop: spacing.lg,
    gap: spacing.md
  },
  menuSectionHeader: {
    marginBottom: spacing.xs
  },
  sectionHeading: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: "800"
  },
  sectionSub: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 18
  },
  menuEmpty: {
    marginTop: spacing.sm
  },
  menuCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.soft
  },
  menuCardTop: {
    flexDirection: "row",
    gap: spacing.md
  },
  menuCardBody: {
    flex: 1,
    minWidth: 0
  },
  menuTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs
  },
  menuItemName: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.h3,
    flex: 1
  },
  availPill: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1
  },
  availOn: {
    backgroundColor: colors.successMuted,
    borderColor: "rgba(15, 157, 90, 0.35)"
  },
  availOff: {
    backgroundColor: "rgba(107, 120, 147, 0.12)",
    borderColor: colors.border
  },
  availPillText: {
    fontSize: typography.micro,
    fontWeight: "800",
    color: colors.textSecondary
  },
  menuCategoryLine: {
    color: colors.primaryDark,
    fontSize: typography.caption,
    fontWeight: "700",
    marginTop: 4
  },
  menuItemPrice: {
    color: colors.primaryDark,
    marginTop: 4,
    fontWeight: "800",
    fontSize: typography.bodySm
  },
  menuItemDesc: {
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: typography.caption,
    lineHeight: 18
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: colors.section
  },
  menuCardActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: spacing.xs
  },
  addProductButtonWrap: {
    marginTop: 12,
    marginBottom: 16
  },
  inlineActionButton: {
    minWidth: 118
  },
  activationBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay
  },
  activationCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    maxHeight: "88%",
    ...shadows.card
  },
  activationKeyboardAvoid: {
    width: "100%"
  },
  activationContent: {
    gap: spacing.sm,
    paddingBottom: spacing.md
  },
  activationTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.h2
  },
  activationSubtitle: {
    color: colors.textSecondary,
    lineHeight: 22,
    fontSize: typography.bodySm
  },
  activationInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: typography.bodySm,
    textAlign: "right",
    writingDirection: "rtl"
  },
  geoButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.section,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs
  },
  geoButtonText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: typography.bodySm
  },
  menuModalImagePreview: {
    width: "100%",
    height: 140,
    borderRadius: radius.md,
    backgroundColor: colors.section
  },
  activationError: {
    color: colors.danger,
    fontSize: typography.caption,
    fontWeight: "600"
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  modalButtonsRow: {
    gap: 12
  },
  modalActionItem: {
    flex: 1
  },
  mapHelperText: {
    color: colors.textMuted,
    fontSize: typography.micro
  },
  activationMap: {
    width: "100%",
    height: 180,
    borderRadius: radius.md,
    overflow: "hidden"
  },
  categoryChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingVertical: 8,
    paddingHorizontal: spacing.md
  },
  categoryChipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.borderStrong
  },
  categoryChipText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: typography.caption
  },

});
