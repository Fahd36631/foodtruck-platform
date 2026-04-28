import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Location from "expo-location";
import type { MapPressEvent, Region } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";

import { AppButton, AppContainer, CustomerMapView, Marker } from "@/ui";
import { getMyOwnerTruckDraft, getMyOwnerTrucks, registerTruck, uploadSingleFile } from "@/features/trucks/api";
import type { RootStackParamList } from "@/navigation/root-stack";
import { getReadableNetworkError } from "@/api/network-error";
import { useAuthStore } from "@/store/auth-store";
import { colors, radius, shadows, spacing, typography } from "@/theme/tokens";

type RootNav = NativeStackNavigationProp<RootStackParamList>;
type OwnerOnboardingRoute = RouteProp<RootStackParamList, "OwnerOnboarding">;

const FOOD_CATEGORY_OPTIONS = [
  "برجر",
  "بيتزا",
  "مشروبات",
  "قهوة",
  "حلويات",
  "سندويتشات",
  "مأكولات بحرية",
  "مأكولات شعبية"
];

const formatDate = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const toNullableNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const OwnerOnboardingScreen = () => {
  const navigation = useNavigation<RootNav>();
  const route = useRoute<OwnerOnboardingRoute>();
  const flow = route.params?.flow ?? "register";
  const isUpdateFlow = flow === "update";
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken) ?? "";

  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [pickedLocation, setPickedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isFoodCategoryVisible, setIsFoodCategoryVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 24.7136,
    longitude: 46.6753,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08
  });
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseDocumentUri, setLicenseDocumentUri] = useState("");
  const [licenseDocumentName, setLicenseDocumentName] = useState("");
  const [licenseDocumentMimeType, setLicenseDocumentMimeType] = useState<string | undefined>();
  const [selectedExpiryDate, setSelectedExpiryDate] = useState<Date | null>(null);
  const [coverImageUri, setCoverImageUri] = useState("");
  const [coverImageName, setCoverImageName] = useState("");
  const [coverImageMimeType, setCoverImageMimeType] = useState<string | undefined>();
  const [foodType, setFoodType] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const ownerDraftQuery = useQuery({
    queryKey: ["owner-truck-draft", accessToken],
    queryFn: () => getMyOwnerTruckDraft(accessToken),
    enabled: !!accessToken
  });

  const ownerTrucksQuery = useQuery({
    queryKey: ["owner-my-trucks", accessToken],
    queryFn: () => getMyOwnerTrucks(accessToken),
    enabled: !!accessToken
  });

  const draftRow = ownerDraftQuery.data;
  const truckMeta = useMemo(() => {
    if (!draftRow?.id) return null;
    return ownerTrucksQuery.data?.find((t) => t.id === draftRow.id) ?? null;
  }, [draftRow?.id, ownerTrucksQuery.data]);

  const reviewNote = truckMeta?.review_note?.trim() ?? null;
  const approvalStatus = draftRow?.approval_status;

  const licenseExpiryDate = selectedExpiryDate ? formatDate(selectedExpiryDate) : "";

  useEffect(() => {
    const draft = ownerDraftQuery.data;
    if (!draft) {
      return;
    }

    setDisplayName(draft.display_name ?? "");
    setFoodType(draft.category_name ?? "");
    setDescription(draft.description ?? "");
    setWorkingHours(draft.working_hours ?? "");
    setContactPhone(draft.contact_phone ?? "");
    setCity(draft.city ?? "");
    setNeighborhood(draft.neighborhood ?? "");
    const draftLatitude = toNullableNumber(draft.latitude);
    const draftLongitude = toNullableNumber(draft.longitude);
    if (draftLatitude !== null && draftLongitude !== null) {
      setPickedLocation({ latitude: draftLatitude, longitude: draftLongitude });
      setMapRegion((prev) => ({
        ...prev,
        latitude: draftLatitude,
        longitude: draftLongitude
      }));
    }
    setLicenseNumber(draft.license_number ?? "");
    if (draft.document_url) {
      setLicenseDocumentUri(draft.document_url);
      setLicenseDocumentName("ملف الرخصة الحالي");
    }
    if (draft.cover_image_url) {
      setCoverImageUri(draft.cover_image_url);
      setCoverImageName("صورة الترك الحالية");
    }
    if (draft.expires_at) {
      const parsedDate = new Date(draft.expires_at);
      if (!Number.isNaN(parsedDate.getTime())) {
        setSelectedExpiryDate(parsedDate);
      }
    }

  }, [ownerDraftQuery.data]);

  const isFormValid = useMemo(() => {
    return (
      !!displayName.trim() &&
      !!city.trim() &&
      !!neighborhood.trim() &&
      !!pickedLocation &&
      !!licenseNumber.trim() &&
      !!licenseDocumentUri.trim() &&
      !!licenseExpiryDate.trim() &&
      !!foodType.trim() &&
      !!workingHours.trim() &&
      !!contactPhone.trim()
    );
  }, [
    city,
    contactPhone,
    displayName,
    foodType,
    licenseDocumentUri,
    licenseExpiryDate,
    licenseNumber,
    neighborhood,
    pickedLocation,
    workingHours
  ]);

  const openMapAndPickCurrentLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setFormError("للوصول السريع للموقع، اسمح للتطبيق بالوصول للموقع الجغرافي.");
      return;
    }

    const current = await Location.getCurrentPositionAsync({});
    setMapRegion((prev) => ({
      ...prev,
      latitude: current.coords.latitude,
      longitude: current.coords.longitude
    }));
    setIsMapVisible(true);
  };

  const onMapPress = (event: MapPressEvent) => {
    const coords = event.nativeEvent.coordinate;
    setPickedLocation({ latitude: coords.latitude, longitude: coords.longitude });
  };

  const pickTruckImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFormError("يرجى السماح بالوصول للصور لاختيار صورة الترك.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setCoverImageUri(result.assets[0].uri);
      setCoverImageName(result.assets[0].fileName ?? "");
      setCoverImageMimeType(result.assets[0].mimeType ?? undefined);
      setFormError("");
    }
  };

  const pickLicenseDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
      multiple: false
    });

    if (!result.canceled && result.assets[0]) {
      setLicenseDocumentUri(result.assets[0].uri);
      setLicenseDocumentName(result.assets[0].name);
      setLicenseDocumentMimeType(result.assets[0].mimeType ?? undefined);
      setFormError("");
    }
  };

  const onExpiryDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setIsDatePickerVisible(false);
    }
    if (event.type === "set" && date) {
      setSelectedExpiryDate(date);
      setFormError("");
    }
  };

  const registerMutation = useMutation({
    mutationFn: async () => {
      const uploadedLicense = licenseDocumentUri.trim().startsWith("http")
        ? { url: licenseDocumentUri.trim() }
        : await uploadSingleFile(
            {
              uri: licenseDocumentUri.trim(),
              fileName: licenseDocumentName || undefined,
              mimeType: licenseDocumentMimeType
            },
            accessToken
          );
      const uploadedCover = !coverImageUri
        ? null
        : coverImageUri.startsWith("http")
          ? { url: coverImageUri }
          : await uploadSingleFile(
              {
                uri: coverImageUri,
                fileName: coverImageName || undefined,
                mimeType: coverImageMimeType
              },
              accessToken
            );

      return registerTruck(
        {
          displayName: displayName.trim(),
          categoryName: foodType.trim(),
          description: description.trim() || undefined,
          workingHours: workingHours.trim(),
          contactPhone: contactPhone.trim(),
          coverImageUrl: uploadedCover?.url,
          location: {
            city: city.trim(),
            neighborhood: neighborhood.trim(),
            latitude: pickedLocation?.latitude ?? 0,
            longitude: pickedLocation?.longitude ?? 0
          },
          license: {
            licenseNumber: licenseNumber.trim(),
            documentUrl: uploadedLicense.url,
            expiresAt: licenseExpiryDate.trim()
          }
        },
        accessToken
      );
    },
    onSuccess: async () => {
      setFormError("");
      setSuccessMessage(
        isUpdateFlow
          ? "تم إرسال طلب تحديث بيانات الترك للإدارة."
          : "تم استلام طلبك، سيتم مراجعته من قبل الإدارة."
      );
      await queryClient.invalidateQueries({ queryKey: ["owner-my-trucks"] });
      await queryClient.invalidateQueries({ queryKey: ["owner-truck-draft"] });
      setTimeout(() => {
        navigation.goBack();
      }, 900);
    },
    onError: (error) => {
      setSuccessMessage("");
      setFormError(getReadableNetworkError(error));
    }
  });

  const submitLocked = approvalStatus === "pending";
  const isSubmitDisabled = !isFormValid || registerMutation.isPending || submitLocked;

  const handleSubmit = () => {
    setFormError("");
    setSuccessMessage("");
    if (isUpdateFlow) {
      Alert.alert("تأكيد تحديث بيانات الترك", "سيتم إرسال طلب التحديث إلى الإدارة للمراجعة. هل تريد المتابعة؟", [
        { text: "إلغاء", style: "cancel" },
        { text: "تأكيد التحديث", onPress: () => registerMutation.mutate() }
      ]);
      return;
    }
    registerMutation.mutate();
  };

  console.log("isFormValid:", isFormValid);

  return (
    <AppContainer edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={20}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {submitLocked ? (
          <View style={[styles.noticeBanner, styles.noticeWarning]}>
            <Ionicons name="time-outline" size={22} color={colors.warning} />
            <Text style={styles.noticeBody}>
              يوجد طلب تحديث قيد المراجعة من الإدارة. لا يمكن إرسال طلب جديد حتى تُعالَج المراجعة الحالية.
            </Text>
          </View>
        ) : null}
        {approvalStatus === "rejected" && reviewNote ? (
          <View style={[styles.noticeBanner, styles.noticeDanger]}>
            <Ionicons name="close-circle-outline" size={22} color={colors.danger} />
            <View style={styles.noticeTextBlock}>
              <Text style={styles.noticeTitle}>آخر قرار: مرفوض</Text>
              <Text style={styles.noticeBody}>{reviewNote}</Text>
            </View>
          </View>
        ) : null}
        {approvalStatus === "rejected" && !reviewNote ? (
          <View style={[styles.noticeBanner, styles.noticeDanger]}>
            <Ionicons name="alert-circle-outline" size={22} color={colors.danger} />
            <Text style={styles.noticeBody}>تم رفض آخر طلب. عدّل البيانات ثم أعد الإرسال للمراجعة.</Text>
          </View>
        ) : null}
        {isUpdateFlow && approvalStatus === "approved" && !submitLocked ? (
          <View style={[styles.noticeBanner, styles.noticeInfo]}>
            <Ionicons name="information-circle-outline" size={22} color={colors.primaryDark} />
            <Text style={styles.noticeBody}>
              عند الضغط على حفظ يُرسل طلب تحديث للإدارة. لن تُحدَّث بياناتك لدى الزبائن قبل الموافقة.
            </Text>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <Text style={styles.title}>{isUpdateFlow ? "بيانات الترك" : "إكمال بيانات الفود ترك"}</Text>
          <Text style={styles.subtitle}>
            {isUpdateFlow
              ? "تُحمَّل الحقول من بيانات تسجيلك الحالية. عدّل ما تحتاج ثم أرسل طلب التحديث لمراجعة الإدارة."
              : "أدخل بيانات عربتك مرة واحدة ثم ستظهر حالتها بانتظار المراجعة."}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>بيانات الفود ترك</Text>
          <TextInput style={styles.input} placeholder="اسم الفود ترك" placeholderTextColor={colors.textMuted} value={displayName} onChangeText={setDisplayName} />
          <Pressable style={styles.inputLikeButton} onPress={() => setIsFoodCategoryVisible(true)}>
            <Text style={foodType ? styles.inputLikeButtonValue : styles.inputLikeButtonPlaceholder}>{foodType || "نوع الأكل / المشروبات"}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.primary} />
          </Pressable>
          <TextInput style={styles.input} placeholder="المدينة" placeholderTextColor={colors.textMuted} value={city} onChangeText={setCity} />
          <TextInput style={styles.input} placeholder="الحي" placeholderTextColor={colors.textMuted} value={neighborhood} onChangeText={setNeighborhood} />
          <TextInput style={styles.input} placeholder="أوقات العمل" placeholderTextColor={colors.textMuted} value={workingHours} onChangeText={setWorkingHours} />
          <TextInput
            style={styles.input}
            placeholder="رقم التواصل"
            placeholderTextColor={colors.textMuted}
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="وصف الفود ترك"
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
          />

        <Text style={styles.sectionTitle}>بيانات الموقع</Text>
        <Pressable style={styles.attachmentButton} onPress={openMapAndPickCurrentLocation}>
          <View style={styles.attachmentLabelWrap}>
            <Ionicons name="map-outline" size={18} color={colors.primary} />
            <Text style={styles.attachmentLabel}>تحديد الموقع من الخريطة</Text>
          </View>
          <Text style={styles.attachmentHint}>
            {pickedLocation
              ? `${Number(pickedLocation.latitude).toFixed(5)}, ${Number(pickedLocation.longitude).toFixed(5)}`
              : "اضغط لتحديد موقع الترك"}
          </Text>
        </Pressable>

        <Text style={styles.sectionTitle}>المرفقات والرخصة</Text>
        <Pressable style={styles.attachmentButton} onPress={pickTruckImage}>
          <View style={styles.attachmentLabelWrap}>
            <Ionicons name="image-outline" size={18} color={colors.primary} />
            <Text style={styles.attachmentLabel}>إرفاق صورة الترك</Text>
          </View>
          <Text style={styles.attachmentHint}>{coverImageUri ? "تم اختيار صورة بنجاح" : "اختر صورة من الجهاز"}</Text>
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder="رقم رخصة البلدية"
          placeholderTextColor={colors.textMuted}
          value={licenseNumber}
          onChangeText={setLicenseNumber}
        />
        <Pressable style={styles.attachmentButton} onPress={pickLicenseDocument}>
          <View style={styles.attachmentLabelWrap}>
            <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
            <Text style={styles.attachmentLabel}>إرفاق رخصة البلدية</Text>
          </View>
          <Text style={styles.attachmentHint}>{licenseDocumentName || "اختر ملف PDF أو صورة للرخصة"}</Text>
        </Pressable>
        <Pressable style={styles.inputLikeButton} onPress={() => setIsDatePickerVisible(true)}>
          <Text style={licenseExpiryDate ? styles.inputLikeButtonValue : styles.inputLikeButtonPlaceholder}>
            {licenseExpiryDate || "تاريخ انتهاء الرخصة"}
          </Text>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        </Pressable>
        </View>

        <View style={styles.ctaBlock}>
          <AppButton
            label={isUpdateFlow ? "تأكيد التحديث" : "إرسال الطلب"}
            onPress={handleSubmit}
            disabled={isSubmitDisabled}
            loading={registerMutation.isPending}
            variant="primary"
            fullWidth
            size="lg"
          />
          <AppButton label="العودة" onPress={() => navigation.goBack()} variant="secondary" fullWidth />
        </View>
        {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

        <Modal visible={isFoodCategoryVisible} transparent animationType="slide" onRequestClose={() => setIsFoodCategoryVisible(false)}>
          <Pressable style={styles.dropdownBackdrop} onPress={() => setIsFoodCategoryVisible(false)}>
            <View style={styles.dropdownCard}>
              <Text style={styles.dropdownTitle}>اختر نوع النشاط</Text>
              {FOOD_CATEGORY_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={styles.dropdownOption}
                  onPress={() => {
                    setFoodType(option);
                    setIsFoodCategoryVisible(false);
                  }}
                >
                  <Text style={styles.dropdownOptionText}>{option}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>

        <Modal visible={isMapVisible} transparent animationType="slide" onRequestClose={() => setIsMapVisible(false)}>
          <View style={styles.mapModalBackdrop}>
            <View style={styles.mapCard}>
              <View style={styles.mapHeader}>
                <Text style={styles.mapTitle}>حدد موقع الفود ترك</Text>
                <Pressable onPress={() => setIsMapVisible(false)}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </Pressable>
              </View>
              <CustomerMapView style={styles.map} initialRegion={mapRegion} onPress={onMapPress} userInterfaceStyle="light">
                {pickedLocation ? <Marker coordinate={pickedLocation} /> : null}
              </CustomerMapView>
              <AppButton label="تأكيد الموقع" onPress={() => setIsMapVisible(false)} variant="primary" fullWidth />
            </View>
          </View>
        </Modal>
        {isDatePickerVisible ? (
          <DateTimePicker
            value={selectedExpiryDate ?? new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={onExpiryDateChange}
            minimumDate={new Date()}
          />
        ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </AppContainer>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  content: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: 120
  },
  heroCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.soft
  },
  title: {
    color: colors.brandBlue,
    fontSize: typography.h1,
    fontWeight: "800",
    letterSpacing: 0.2
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    lineHeight: 22,
    fontSize: typography.bodySm
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
    ...shadows.soft
  },
  sectionTitle: {
    color: colors.primaryDark,
    fontWeight: "800",
    fontSize: typography.h3,
    marginTop: spacing.xs,
    marginBottom: spacing.xs
  },
  input: {
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
  inputLikeButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  inputLikeButtonPlaceholder: {
    color: colors.textMuted
  },
  inputLikeButtonValue: {
    color: colors.text,
    fontWeight: "700"
  },
  attachmentButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 6
  },
  attachmentLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  attachmentLabel: {
    color: colors.text,
    fontWeight: "700",
    fontSize: typography.bodySm
  },
  attachmentHint: {
    color: colors.textMuted,
    fontSize: typography.caption
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: "top"
  },
  successText: {
    color: colors.success,
    marginTop: spacing.sm,
    fontWeight: "700",
    fontSize: typography.bodySm,
    textAlign: "center"
  },
  errorText: {
    color: colors.danger,
    marginTop: spacing.sm,
    fontSize: typography.bodySm,
    textAlign: "center"
  },
  dropdownBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay
  },
  dropdownCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card
  },
  dropdownTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.h3,
    marginBottom: spacing.xs
  },
  dropdownOption: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingVertical: 12,
    paddingHorizontal: spacing.md
  },
  dropdownOptionText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: typography.bodySm
  },
  mapModalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end"
  },
  mapCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card
  },
  mapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  mapTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.h3
  },
  map: {
    width: "100%",
    height: 300,
    borderRadius: radius.md,
    overflow: "hidden"
  },
  ctaBlock: {
    gap: spacing.sm,
    marginTop: spacing.md
  },
  noticeBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md
  },
  noticeWarning: {
    backgroundColor: colors.warningMuted,
    borderColor: "rgba(255, 183, 3, 0.45)"
  },
  noticeDanger: {
    backgroundColor: colors.dangerMuted,
    borderColor: "rgba(230, 57, 70, 0.4)"
  },
  noticeInfo: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.borderStrong
  },
  noticeTextBlock: {
    flex: 1,
    gap: 4
  },
  noticeTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.bodySm,
    textAlign: "right"
  },
  noticeBody: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    lineHeight: 22,
    textAlign: "right"
  }
});
