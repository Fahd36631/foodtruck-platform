import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Location from "expo-location";
import type { MapPressEvent, Region } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { AppButton, AppContainer, CustomerMapView, LoadingSkeleton, Marker } from "@/ui";
import { getMyOwnerTruckDraft, getMyOwnerTrucks, registerTruck, uploadSingleFile } from "@/features/trucks/api";
import type { RootStackParamList } from "@/navigation/root-stack";
import { getReadableNetworkError } from "@/api/network-error";
import { useAuthStore } from "@/store/auth-store";
import { FOOD_CATEGORY_OPTIONS } from "@/constants/food-categories";
import { SAUDI_CITIES } from "@/constants/saudi-cities";
import {
  defaultWorkEnd,
  defaultWorkStart,
  formatWorkingHoursDisplay,
  formatWorkingHoursRange,
  isValidWorkRange,
  parseWorkingHoursRange
} from "@/utils/working-hours";
import { OwnerPageHeader } from "@/features/owner/components/owner-page-header";
import { OwnerLicenseExpiryPickerSheet } from "@/features/owner/components/owner-license-expiry-picker-sheet";
import { OwnerWorkHoursPickerSheet } from "@/features/owner/components/owner-work-hours-picker-sheet";
import { formatLicenseExpiryApi, formatLicenseExpiryLabel } from "@/utils/license-expiry-date";
import { resolveMediaUrl } from "@/utils/media-url";
import { colors, radius, shadows, spacing, typography } from "@/theme/tokens";

type RootNav = NativeStackNavigationProp<RootStackParamList>;
type OwnerOnboardingRoute = RouteProp<RootStackParamList, "OwnerOnboarding">;

const rtlText = {
  textAlign: "right" as const,
  writingDirection: "rtl" as const
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
  const [isCityVisible, setIsCityVisible] = useState(false);
  const [isExpiryPickerVisible, setIsExpiryPickerVisible] = useState(false);
  const [workStart, setWorkStart] = useState(() => defaultWorkStart());
  const [workEnd, setWorkEnd] = useState(() => defaultWorkEnd());
  const [isWorkHoursVisible, setIsWorkHoursVisible] = useState(false);
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

  const reviewNote = truckMeta?.review_note?.trim() || draftRow?.rejection_reason?.trim() || null;
  const approvalStatus = draftRow?.approval_status;

  const licenseExpiryDate = selectedExpiryDate ? formatLicenseExpiryApi(selectedExpiryDate) : "";
  const licenseExpiryLabel = selectedExpiryDate ? formatLicenseExpiryLabel(selectedExpiryDate) : "";
  const workingHoursValue = useMemo(() => formatWorkingHoursRange(workStart, workEnd), [workStart, workEnd]);
  const workingHoursLabel = useMemo(() => formatWorkingHoursDisplay(workStart, workEnd), [workStart, workEnd]);

  const openWorkHoursPicker = () => {
    Keyboard.dismiss();
    setIsWorkHoursVisible(true);
  };

  useEffect(() => {
    const draft = ownerDraftQuery.data;
    if (!draft) {
      return;
    }

    setDisplayName(draft.display_name ?? "");
    setFoodType(draft.category_name ?? "");
    setDescription(draft.description ?? "");
    const parsedHours = parseWorkingHoursRange(draft.working_hours);
    if (parsedHours) {
      setWorkStart(parsedHours.start);
      setWorkEnd(parsedHours.end);
    }
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
    const existingLicenseUrl = draft.license_file_url ?? draft.document_url;
    if (existingLicenseUrl) {
      setLicenseDocumentUri(existingLicenseUrl);
      setLicenseDocumentName("");
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
      isValidWorkRange(workStart, workEnd) &&
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
    workEnd,
    workStart
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

  const openExpiryPicker = () => {
    Keyboard.dismiss();
    setIsExpiryPickerVisible(true);
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
          workingHours: workingHoursValue,
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
        !isUpdateFlow
          ? "تم استلام طلبك، سيتم مراجعته من قبل الإدارة."
          : approvalStatus === "rejected"
            ? "تم إعادة الإرسال بنجاح؛ طلبك الآن قيد المراجعة."
            : "تم إرسال طلب تحديث بيانات الترك للإدارة."
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

  const showDraftLoading = isUpdateFlow && !!accessToken && !ownerDraftQuery.isFetched;
  const coverAttachmentHint =
    !coverImageUri.trim()
      ? "اختر صورة من الجهاز"
      : coverImageUri.trim().startsWith("http")
        ? "صورة الترك الحالية — يمكنك اختيار صورة جديدة إن رغبت"
        : "تم اختيار صورة جديدة";
  const licenseAttachmentHint =
    !licenseDocumentUri.trim()
      ? "اختر ملف PDF أو صورة للرخصة"
      : licenseDocumentUri.trim().startsWith("http")
        ? "تم إرفاق رخصة سابقًا — يمكنك إرفاق ملف جديد إن رغبت"
        : licenseDocumentName.trim() || "تم اختيار ملف جديد";

  return (
    <AppContainer edges={["top"]}>
      <View style={styles.screen}>
      {showDraftLoading ? (
        <View style={styles.loadingPad}>
          <LoadingSkeleton rows={10} />
        </View>
      ) : (
      <>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={20}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {submitLocked ? (
          <View style={[styles.noticeBanner, styles.noticeWarning]}>
            <Text style={styles.noticeBody}>
              يوجد طلب تحديث قيد المراجعة من الإدارة. لا يمكن إرسال طلب جديد حتى تُعالَج المراجعة الحالية.
            </Text>
            <Ionicons name="time-outline" size={22} color={colors.warning} style={styles.noticeIcon} />
          </View>
        ) : null}
        {approvalStatus === "rejected" && reviewNote ? (
          <View style={[styles.noticeBanner, styles.noticeDanger]}>
            <View style={styles.noticeTextBlock}>
              <Text style={styles.noticeTitle}>آخر قرار: مرفوض</Text>
              <Text style={styles.noticeBody}>{reviewNote}</Text>
            </View>
            <Ionicons name="close-circle-outline" size={22} color={colors.danger} style={styles.noticeIcon} />
          </View>
        ) : null}
        {approvalStatus === "rejected" && !reviewNote ? (
          <View style={[styles.noticeBanner, styles.noticeDanger]}>
            <Text style={styles.noticeBody}>تم رفض آخر طلب. عدّل البيانات ثم أعد الإرسال للمراجعة.</Text>
            <Ionicons name="alert-circle-outline" size={22} color={colors.danger} style={styles.noticeIcon} />
          </View>
        ) : null}
        {isUpdateFlow && approvalStatus === "approved" && !submitLocked ? (
          <View style={[styles.noticeBanner, styles.noticeInfo]}>
            <Text style={styles.noticeBody}>
              عند الضغط على حفظ يُرسل طلب تحديث للإدارة. لن تُحدَّث بياناتك لدى الزبائن قبل الموافقة.
            </Text>
            <Ionicons name="information-circle-outline" size={22} color={colors.primaryDark} style={styles.noticeIcon} />
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <OwnerPageHeader
            compact
            title={isUpdateFlow ? "بيانات الترك" : "إكمال بيانات الترك"}
            subtitle={
              isUpdateFlow
                ? "تُحمَّل الحقول من بيانات تسجيلك الحالية. عدّل ما تحتاج ثم أرسل طلب التحديث لمراجعة الإدارة."
                : "أدخل بيانات عربتك مرة واحدة ثم ستظهر حالتها بانتظار المراجعة."
            }
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>بيانات الترك</Text>
          <TextInput style={styles.input} placeholder="اسم الترك" placeholderTextColor={colors.textMuted} value={displayName} onChangeText={setDisplayName} textAlign="right" />
          <Pressable style={styles.inputLikeButton} onPress={() => setIsFoodCategoryVisible(true)}>
            <Ionicons name="chevron-down" size={18} color={colors.primary} style={styles.fieldIconLeading} />
            <Text style={[styles.inputLikeButtonText, foodType ? styles.inputLikeButtonValue : styles.inputLikeButtonPlaceholder]}>
              {foodType || "نوع الأكل / المشروبات"}
            </Text>
          </Pressable>
          <Pressable style={styles.inputLikeButton} onPress={() => setIsCityVisible(true)}>
            <Ionicons name="chevron-down" size={18} color={colors.primary} style={styles.fieldIconLeading} />
            <Text style={[styles.inputLikeButtonText, city ? styles.inputLikeButtonValue : styles.inputLikeButtonPlaceholder]}>
              {city || "المدينة"}
            </Text>
          </Pressable>
          <TextInput style={styles.input} placeholder="الحي" placeholderTextColor={colors.textMuted} value={neighborhood} onChangeText={setNeighborhood} textAlign="right" />
          <Text style={styles.fieldLabel}>أوقات العمل</Text>
          <Pressable style={styles.inputLikeButton} onPress={openWorkHoursPicker}>
            <Text style={[styles.inputLikeButtonText, styles.inputLikeButtonValue]}>{workingHoursLabel}</Text>
            <Ionicons name="time-outline" size={18} color={colors.primary} style={styles.fieldIconTrailing} />
          </Pressable>
          {!isValidWorkRange(workStart, workEnd) ? (
            <Text style={styles.inlineHint}>يجب أن يكون وقت النهاية بعد وقت البداية.</Text>
          ) : null}
          <TextInput
            style={styles.input}
            placeholder="رقم التواصل"
            placeholderTextColor={colors.textMuted}
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
            textAlign="right"
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="وصف الترك"
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlign="right"
          />

        <Text style={styles.sectionTitle}>بيانات الموقع</Text>
        <Pressable style={styles.attachmentButton} onPress={openMapAndPickCurrentLocation}>
          <View style={styles.attachmentLabelWrap}>
            <Text style={styles.attachmentLabel}>تحديد الموقع من الخريطة</Text>
            <Ionicons name="map-outline" size={18} color={colors.primary} style={styles.fieldIconTrailing} />
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
            <Text style={styles.attachmentLabel}>إرفاق صورة الترك</Text>
            <Ionicons name="image-outline" size={18} color={colors.primary} style={styles.fieldIconTrailing} />
          </View>
          <Text style={styles.attachmentHint}>{coverAttachmentHint}</Text>
        </Pressable>
        {coverImageUri.trim().startsWith("http") ? (
          <Image
            accessibilityLabel="صورة الترك الحالية"
            source={{ uri: resolveMediaUrl(coverImageUri.trim()) ?? coverImageUri.trim() }}
            style={styles.coverPreview}
            resizeMode="cover"
          />
        ) : null}
        <TextInput
          style={styles.input}
          placeholder="رقم رخصة البلدية"
          placeholderTextColor={colors.textMuted}
          value={licenseNumber}
          onChangeText={setLicenseNumber}
          textAlign="right"
        />
        <Pressable style={styles.attachmentButton} onPress={pickLicenseDocument}>
          <View style={styles.attachmentLabelWrap}>
            <Text style={styles.attachmentLabel}>إرفاق رخصة البلدية</Text>
            <Ionicons name="document-attach-outline" size={18} color={colors.primary} style={styles.fieldIconTrailing} />
          </View>
          <Text style={styles.attachmentHint}>{licenseAttachmentHint}</Text>
        </Pressable>
        <Pressable style={styles.inputLikeButton} onPress={openExpiryPicker}>
          <Text style={[styles.inputLikeButtonText, licenseExpiryLabel ? styles.inputLikeButtonValue : styles.inputLikeButtonPlaceholder]}>
            {licenseExpiryLabel || "تاريخ انتهاء الرخصة"}
          </Text>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} style={styles.fieldIconTrailing} />
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
            <Pressable style={styles.dropdownCard} onPress={() => undefined}>
              <Text style={styles.dropdownTitle}>نوع الأكل / المشروبات</Text>
              {FOOD_CATEGORY_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.dropdownOption, foodType === option && styles.dropdownOptionActive]}
                  onPress={() => {
                    setFoodType(option);
                    setIsFoodCategoryVisible(false);
                  }}
                >
                  <Text style={styles.dropdownOptionText}>{option}</Text>
                </Pressable>
              ))}
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={isCityVisible} transparent animationType="slide" onRequestClose={() => setIsCityVisible(false)}>
          <Pressable style={styles.dropdownBackdrop} onPress={() => setIsCityVisible(false)}>
            <Pressable style={styles.dropdownCard} onPress={() => undefined}>
              <Text style={styles.dropdownTitle}>اختر المدينة</Text>
              <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
                {SAUDI_CITIES.map((option) => (
                  <Pressable
                    key={option}
                    style={[styles.dropdownOption, city === option && styles.dropdownOptionActive]}
                    onPress={() => {
                      setCity(option);
                      setIsCityVisible(false);
                    }}
                  >
                    <Text style={styles.dropdownOptionText}>{option}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        <OwnerLicenseExpiryPickerSheet
          visible={isExpiryPickerVisible}
          value={selectedExpiryDate}
          minimumDate={new Date()}
          onClose={() => setIsExpiryPickerVisible(false)}
          onConfirm={(date) => {
            setSelectedExpiryDate(date);
            setFormError("");
          }}
        />

        <OwnerWorkHoursPickerSheet
          visible={isWorkHoursVisible}
          start={workStart}
          end={workEnd}
          onClose={() => setIsWorkHoursVisible(false)}
          onConfirm={(start, end) => {
            setWorkStart(start);
            setWorkEnd(end);
          }}
        />

        <Modal visible={isMapVisible} transparent animationType="slide" onRequestClose={() => setIsMapVisible(false)}>
          <View style={styles.mapModalBackdrop}>
            <View style={styles.mapCard}>
              <View style={styles.mapHeader}>
                <Pressable onPress={() => setIsMapVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </Pressable>
                <Text style={styles.mapTitle}>حدد موقع الترك</Text>
              </View>
              <CustomerMapView style={styles.map} initialRegion={mapRegion} onPress={onMapPress} userInterfaceStyle="light">
                {pickedLocation ? <Marker coordinate={pickedLocation} /> : null}
              </CustomerMapView>
              <AppButton label="تأكيد الموقع" onPress={() => setIsMapVisible(false)} variant="primary" fullWidth />
            </View>
          </View>
        </Modal>
        </ScrollView>
      </KeyboardAvoidingView>
      </>
      )}
      </View>
    </AppContainer>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  loadingPad: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md
  },
  flex: {
    flex: 1
  },
  content: {
    alignItems: "stretch",
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: 96
  },
  heroCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignSelf: "stretch",
    ...shadows.soft
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
    alignSelf: "stretch",
    ...shadows.soft
  },
  sectionTitle: {
    ...rtlText,
    color: colors.primaryDark,
    fontWeight: "800",
    fontSize: typography.h3,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    alignSelf: "stretch"
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
    alignSelf: "stretch",
    width: "100%",
    ...rtlText
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
    alignSelf: "stretch",
    width: "100%",
    gap: spacing.sm
  },
  inputLikeButtonText: {
    flex: 1,
    flexShrink: 1,
    fontSize: typography.bodySm,
    includeFontPadding: false,
    ...rtlText
  },
  fieldIconLeading: {
    flexShrink: 0,
    marginEnd: spacing.xs
  },
  fieldIconTrailing: {
    flexShrink: 0,
    marginStart: spacing.xs
  },
  fieldLabel: {
    ...rtlText,
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: typography.caption,
    marginTop: 2,
    alignSelf: "stretch"
  },
  inlineHint: {
    ...rtlText,
    color: colors.danger,
    fontSize: typography.caption,
    alignSelf: "stretch"
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
    gap: 6,
    alignSelf: "stretch",
    width: "100%"
  },
  attachmentLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    width: "100%",
    gap: spacing.sm
  },
  attachmentLabel: {
    ...rtlText,
    flex: 1,
    color: colors.text,
    fontWeight: "700",
    fontSize: typography.bodySm
  },
  attachmentHint: {
    ...rtlText,
    color: colors.textMuted,
    fontSize: typography.caption,
    alignSelf: "stretch"
  },
  coverPreview: {
    width: "100%",
    height: 160,
    borderRadius: radius.md,
    backgroundColor: colors.border,
    alignSelf: "stretch"
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: "top",
    ...rtlText
  },
  successText: {
    ...rtlText,
    color: colors.success,
    marginTop: spacing.sm,
    fontWeight: "700",
    fontSize: typography.bodySm,
    alignSelf: "stretch"
  },
  errorText: {
    ...rtlText,
    color: colors.danger,
    marginTop: spacing.sm,
    fontSize: typography.bodySm,
    alignSelf: "stretch"
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
    ...rtlText,
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.h3,
    marginBottom: spacing.xs
  },
  dropdownScroll: {
    maxHeight: 360
  },
  dropdownOption: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs
  },
  dropdownOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted
  },
  dropdownOptionText: {
    ...rtlText,
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
    marginBottom: spacing.sm,
    width: "100%"
  },
  mapTitle: {
    ...rtlText,
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.h3,
    flex: 1
  },
  map: {
    width: "100%",
    height: 300,
    borderRadius: radius.md,
    overflow: "hidden"
  },
  ctaBlock: {
    gap: spacing.sm,
    marginTop: spacing.md,
    alignSelf: "stretch",
    width: "100%"
  },
  noticeBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    alignSelf: "stretch",
    width: "100%"
  },
  noticeIcon: {
    flexShrink: 0,
    marginTop: 2
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
    gap: 4,
    alignSelf: "stretch"
  },
  noticeTitle: {
    ...rtlText,
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.bodySm,
    alignSelf: "stretch"
  },
  noticeBody: {
    ...rtlText,
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    lineHeight: 22,
    alignSelf: "stretch"
  }
});
