import { useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppContainer, EmptyState } from "@/ui";
import type { RootStackParamList } from "@/navigation/root-stack";
import { useCartStore } from "@/store/cart-store";
import { resolveMediaUrl } from "@/utils/media-url";
import { spacing, typography } from "@/theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Cart">;

const CART = {
  navy: "#1A2B48",
  orange: "#FF6B00",
  orangeDark: "#E55A00",
  orangeSoft: "#FFF4EB",
  white: "#FFFFFF",
  canvas: "#F5F7FB",
  textMuted: "#6B7280",
  textSecondary: "#4B5563",
  border: "#E8ECF2",
  shadow: "rgba(26, 43, 72, 0.08)",
  success: "#16A34A",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2"
} as const;

const TRUCK_PLACEHOLDER = require("../../assets/images/truck_logo.png");
const PICKUP_ETA_LABEL = "جاهز للاستلام خلال 10 - 15 د";

const fmtAmount = (value: number) =>
  `${value.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ر.س`;

export const CartScreen = ({ navigation }: Props) => {
  const {
    truckName,
    items,
    notes,
    subtotal,
    total,
    pickupTypeLabel,
    incrementItem,
    decrementItem,
    removeItem,
    setNotes,
    clearCart
  } = useCartStore();

  const [notesOpen, setNotesOpen] = useState(() => notes.trim().length > 0);
  const serviceFee = useMemo(() => Number(Math.max(0, total - subtotal).toFixed(2)), [subtotal, total]);

  if (items.length === 0) {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.emptyWrap}>
          <CartPageHeader title="السلة" onBack={() => navigation.goBack()} />
          <EmptyState
            title="السلة فارغة"
            description="اختر أصنافك من أي ترك ثم أكمل الدفع من هنا."
            icon="basket-outline"
            actionLabel="العودة للتركات"
            onAction={() => navigation.navigate("MainTabs", { screen: "Home" })}
            variant="card"
          />
        </View>
      </AppContainer>
    );
  }

  return (
    <AppContainer edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <CartPageHeader title="السلة" onBack={() => navigation.goBack()} />

        <View style={styles.pickupBadge}>
          <Ionicons name="lock-closed-outline" size={12} color={CART.orange} />
          <Text style={styles.pickupBadgeText}>{pickupTypeLabel}</Text>
        </View>

        <View style={styles.truckCard}>
          <Image source={TRUCK_PLACEHOLDER} style={styles.truckImage} resizeMode="cover" />
          <View style={styles.truckBody}>
            <Text style={styles.truckName} numberOfLines={1}>
              {truckName}
            </Text>
            <Text style={styles.truckEta}>{PICKUP_ETA_LABEL}</Text>
          </View>
          <View style={styles.truckRefreshBtn}>
            <Ionicons name="refresh-outline" size={18} color={CART.textMuted} />
          </View>
        </View>

        <View style={styles.itemsCard}>
          {items.map((item, index) => (
            <View key={item.menuItemId}>
              <CartItemCard
                name={item.name}
                description={`${item.quantity.toLocaleString("ar-SA")} × ${fmtAmount(item.price)} للقطعة`}
                price={fmtAmount(item.price * item.quantity)}
                imageUri={resolveMediaUrl(item.imageUrl)}
                quantity={item.quantity}
                onIncrement={() => incrementItem(item.menuItemId)}
                onDecrement={() => decrementItem(item.menuItemId)}
                onRemove={() => removeItem(item.menuItemId)}
              />
              {index < items.length - 1 ? <View style={styles.itemDivider} /> : null}
            </View>
          ))}
        </View>

        {notesOpen ? (
          <View style={styles.notesCard}>
            <View style={styles.notesHead}>
              <Text style={styles.notesTitle}>ملاحظة الطلب</Text>
              <Pressable onPress={() => setNotesOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={18} color={CART.textMuted} />
              </Pressable>
            </View>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="مثال: بدون بصل، زيادة جبن..."
              placeholderTextColor={CART.textMuted}
              style={styles.notesInput}
              multiline
              textAlign="right"
              autoFocus
            />
          </View>
        ) : (
          <Pressable style={styles.notesDashedBtn} onPress={() => setNotesOpen(true)}>
            <View style={styles.notesDashedIcon}>
              <Ionicons name="add" size={16} color={CART.orange} />
            </View>
            <Text style={styles.notesDashedText}>إضافة ملاحظة على الطلب</Text>
          </Pressable>
        )}

        <View style={styles.summaryCard}>
          <SummaryRow label="المجموع الفرعي" value={fmtAmount(subtotal)} />
          <SummaryRow label="رسوم الخدمة" value={fmtAmount(serviceFee)} info />
          <View style={styles.summaryDivider} />
          <SummaryRow label="الإجمالي" value={fmtAmount(total)} strong />
        </View>

        <Pressable
          onPress={() => navigation.navigate("Checkout")}
          style={({ pressed }) => [styles.checkoutPressable, pressed && styles.checkoutPressed]}
        >
          <LinearGradient
            colors={["#FF8533", CART.orange, CART.orangeDark]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.checkoutGradient}
          >
            <View style={styles.checkoutInner}>
              <View style={styles.checkoutArrowWrap}>
                <Ionicons name="chevron-back" size={16} color={CART.orange} />
              </View>
              <Text style={styles.checkoutLabel}>المتابعة إلى الدفع</Text>
            </View>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() =>
            Alert.alert("تفريغ السلة", "هل تريد حذف كل الأصناف من السلة؟", [
              { text: "إلغاء", style: "cancel" },
              { text: "تفريغ", style: "destructive", onPress: clearCart }
            ])
          }
          style={styles.clearBtn}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={16} color={CART.danger} />
          <Text style={styles.clearText}>تفريغ السلة</Text>
        </Pressable>
      </ScrollView>
    </AppContainer>
  );
};

// ============================================================
// Local UI components
// ============================================================

const CartPageHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
  <View style={pageHeader.wrap}>
    <Pressable onPress={onBack} style={({ pressed }) => [pageHeader.backBtn, pressed && pageHeader.backBtnPressed]} hitSlop={8}>
      <Ionicons name="chevron-back" size={20} color={CART.white} />
    </Pressable>
    <Text style={pageHeader.title}>{title}</Text>
    <View style={pageHeader.spacer} />
  </View>
);

const CartItemCard = ({
  name,
  description,
  price,
  imageUri,
  quantity,
  onIncrement,
  onDecrement,
  onRemove
}: {
  name: string;
  description: string;
  price: string;
  imageUri: string | null;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}) => (
  <View style={itemStyles.row}>
    <View style={itemStyles.leftCol}>
      <Pressable onPress={onRemove} style={itemStyles.removeBtn} hitSlop={8} accessibilityLabel="حذف">
        <Ionicons name="trash-outline" size={16} color={CART.textMuted} />
      </Pressable>
      <View style={itemStyles.qtyRow}>
        <Pressable style={itemStyles.qtyBtn} onPress={onIncrement} hitSlop={8} accessibilityLabel="زيادة">
          <Ionicons name="add" size={16} color={CART.orange} />
        </Pressable>
        <Text style={itemStyles.qtyText}>{quantity.toLocaleString("ar-SA")}</Text>
        <Pressable style={itemStyles.qtyBtn} onPress={onDecrement} hitSlop={8} accessibilityLabel="إنقاص">
          <Ionicons name="remove" size={16} color={CART.orange} />
        </Pressable>
      </View>
    </View>

    <View style={itemStyles.meta}>
      <Text style={itemStyles.price}>{price}</Text>
      <Text style={itemStyles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={itemStyles.description} numberOfLines={2}>
        {description}
      </Text>
    </View>

    <View style={itemStyles.thumbWrap}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={itemStyles.thumb} resizeMode="cover" />
      ) : (
        <View style={itemStyles.thumbFallback}>
          <Ionicons name="fast-food-outline" size={20} color={CART.orange} />
        </View>
      )}
    </View>
  </View>
);

const SummaryRow = ({
  label,
  value,
  strong = false,
  info = false
}: {
  label: string;
  value: string;
  strong?: boolean;
  info?: boolean;
}) => (
  <View style={summaryStyles.row}>
    <Text style={[summaryStyles.value, strong && summaryStyles.valueStrong]}>{value}</Text>
    <View style={summaryStyles.labelWrap}>
      {info ? <Ionicons name="information-circle-outline" size={14} color={CART.textMuted} style={summaryStyles.infoIcon} /> : null}
      <Text style={[summaryStyles.label, strong && summaryStyles.labelStrong]}>{label}</Text>
    </View>
  </View>
);

const pageHeader = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: CART.orange,
    alignItems: "center",
    justifyContent: "center"
  },
  backBtnPressed: {
    opacity: 0.9
  },
  title: {
    flex: 1,
    color: CART.navy,
    fontSize: typography.h1,
    fontWeight: "800",
    textAlign: "right",
    paddingHorizontal: spacing.sm
  },
  spacer: {
    width: 40
  }
});

const itemStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.sm
  },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: CART.orangeSoft
  },
  thumb: {
    width: "100%",
    height: "100%"
  },
  thumbFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  meta: {
    flex: 1,
    alignItems: "flex-end",
    gap: 2
  },
  name: {
    color: CART.navy,
    fontWeight: "800",
    fontSize: typography.body,
    textAlign: "right"
  },
  description: {
    color: CART.textMuted,
    fontSize: typography.caption,
    textAlign: "right",
    lineHeight: 18
  },
  price: {
    color: CART.orange,
    fontWeight: "800",
    fontSize: typography.body,
    textAlign: "right",
    marginBottom: 2
  },
  leftCol: {
    alignItems: "flex-start",
    justifyContent: "space-between",
    minHeight: 72,
    gap: spacing.sm
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CART.border,
    backgroundColor: CART.white,
    alignItems: "center",
    justifyContent: "center"
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: CART.orange,
    backgroundColor: CART.white,
    alignItems: "center",
    justifyContent: "center"
  },
  qtyText: {
    minWidth: 20,
    textAlign: "center",
    color: CART.navy,
    fontWeight: "800",
    fontSize: typography.bodySm
  }
});

const summaryStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  labelWrap: {
    flexDirection: "row-reverse",
    alignItems: "center"
  },
  infoIcon: {
    marginLeft: 4
  },
  label: {
    color: CART.textSecondary,
    fontSize: typography.bodySm,
    fontWeight: "600"
  },
  labelStrong: {
    color: CART.navy,
    fontWeight: "800",
    fontSize: typography.body
  },
  value: {
    color: CART.navy,
    fontSize: typography.bodySm,
    fontWeight: "700"
  },
  valueStrong: {
    color: CART.orange,
    fontSize: typography.h2,
    fontWeight: "900"
  }
});

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: CART.canvas },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120,
    gap: spacing.md
  },
  pickupBadge: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: CART.orangeSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: -4
  },
  pickupBadgeText: {
    color: CART.orange,
    fontSize: typography.micro,
    fontWeight: "800"
  },
  truckCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: 16,
    backgroundColor: CART.white,
    padding: spacing.md,
    shadowColor: CART.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3
  },
  truckImage: {
    width: 56,
    height: 56,
    borderRadius: 12
  },
  truckBody: {
    flex: 1,
    alignItems: "flex-end"
  },
  truckName: {
    color: CART.navy,
    fontSize: typography.h3,
    fontWeight: "800",
    textAlign: "right"
  },
  truckEta: {
    marginTop: 4,
    color: CART.success,
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "right"
  },
  truckRefreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  itemsCard: {
    borderRadius: 16,
    backgroundColor: CART.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    shadowColor: CART.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3
  },
  itemDivider: {
    height: 1,
    backgroundColor: CART.border
  },
  notesDashedBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: CART.orange,
    backgroundColor: CART.orangeSoft,
    paddingVertical: 14,
    paddingHorizontal: spacing.md
  },
  notesDashedIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: CART.white,
    alignItems: "center",
    justifyContent: "center"
  },
  notesDashedText: {
    color: CART.orange,
    fontWeight: "800",
    fontSize: typography.bodySm
  },
  notesCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: CART.orange,
    backgroundColor: CART.orangeSoft,
    padding: spacing.md,
    gap: spacing.sm
  },
  notesHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between"
  },
  notesTitle: {
    color: CART.navy,
    fontWeight: "800",
    fontSize: typography.bodySm
  },
  notesInput: {
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CART.border,
    backgroundColor: CART.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: CART.navy,
    textAlignVertical: "top",
    fontSize: typography.bodySm
  },
  summaryCard: {
    borderRadius: 16,
    backgroundColor: CART.white,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: CART.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3
  },
  summaryDivider: {
    height: 1,
    backgroundColor: CART.border,
    marginVertical: 2
  },
  checkoutPressable: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: spacing.xs
  },
  checkoutPressed: {
    opacity: 0.94
  },
  checkoutGradient: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  checkoutInner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    width: "100%"
  },
  checkoutLabel: {
    color: CART.white,
    fontSize: typography.body,
    fontWeight: "800"
  },
  checkoutArrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: CART.white,
    alignItems: "center",
    justifyContent: "center"
  },
  clearBtn: {
    alignSelf: "center",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md
  },
  clearText: {
    color: CART.danger,
    fontSize: typography.bodySm,
    fontWeight: "700"
  }
});
