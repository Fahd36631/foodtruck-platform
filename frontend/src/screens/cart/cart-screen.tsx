import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton, AppContainer, EmptyState } from "@/ui";
import type { RootStackParamList } from "@/navigation/root-stack";
import { useCartStore } from "@/store/cart-store";
import { colors, iconSize, radius, shadows, spacing, typography } from "@/theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Cart">;

const fmtSAR = (value: number) => `${value.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ر.س`;

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

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <AppContainer edges={["top"]}>
        <View style={styles.emptyWrap}>
          <PageHeader title="السلة" subtitle="لم تضف أي صنف بعد" />
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
        <PageHeader
          title="السلة"
          subtitle={`${itemCount.toLocaleString("ar-SA")} صنف جاهز للطلب`}
        />

        <View style={styles.truckCard}>
          <View style={styles.truckIconWrap}>
            <Ionicons name="storefront" size={iconSize.md} color={colors.primary} />
          </View>
          <View style={styles.truckBody}>
            <Text style={styles.truckName} numberOfLines={1}>{truckName}</Text>
            <Text style={styles.truckMeta}>{pickupTypeLabel}</Text>
          </View>
        </View>

        <View style={styles.list}>
          {items.map((item) => {
            const lineTotal = item.price * item.quantity;
            return (
              <View key={item.menuItemId} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Pressable
                    onPress={() => removeItem(item.menuItemId)}
                    hitSlop={12}
                    style={styles.removeBtn}
                    accessibilityLabel="حذف"
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>

                <View style={styles.itemFooter}>
                  <View style={styles.qtyGroup}>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => decrementItem(item.menuItemId)}
                      hitSlop={8}
                      accessibilityLabel="إنقاص"
                    >
                      <Ionicons name="remove" size={16} color={colors.primaryDark} />
                    </Pressable>
                    <Text style={styles.qtyText}>{item.quantity.toLocaleString("ar-SA")}</Text>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => incrementItem(item.menuItemId)}
                      hitSlop={8}
                      accessibilityLabel="زيادة"
                    >
                      <Ionicons name="add" size={16} color={colors.primaryDark} />
                    </Pressable>
                  </View>
                  <View style={styles.itemPriceBlock}>
                    <Text style={styles.itemLineTotal}>{fmtSAR(lineTotal)}</Text>
                    <Text style={styles.itemUnitPrice}>{fmtSAR(item.price)} للقطعة</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.notesCard}>
          <View style={styles.notesHead}>
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={styles.notesTitle}>ملاحظة الطلب</Text>
            <Text style={styles.notesHint}>اختياري</Text>
          </View>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="مثال: بدون بصل، زيادة جبن..."
            placeholderTextColor={colors.textMuted}
            style={styles.notesInput}
            multiline
            textAlign="right"
          />
        </View>

        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>المجموع الفرعي</Text>
            <Text style={styles.totalValue}>{fmtSAR(subtotal)}</Text>
          </View>
          <View style={styles.totalsDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabelStrong}>الإجمالي</Text>
            <Text style={styles.totalValueStrong}>{fmtSAR(total)}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <AppButton
            label="المتابعة إلى الدفع"
            onPress={() => navigation.navigate("Checkout")}
            variant="primary"
            size="lg"
            fullWidth
          />
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
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={styles.clearText}>تفريغ السلة</Text>
          </Pressable>
        </View>
      </ScrollView>
    </AppContainer>
  );
};

// ============================================================
// Page Header (shared layout across cart/checkout/orders)
// ============================================================

const PageHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <View style={pageHeader.wrap}>
    <View style={pageHeader.bar} />
    <View style={pageHeader.body}>
      <Text style={pageHeader.title}>{title}</Text>
      {subtitle ? <Text style={pageHeader.subtitle}>{subtitle}</Text> : null}
    </View>
  </View>
);

const pageHeader = StyleSheet.create({
  wrap: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  bar: {
    width: 4,
    height: 28,
    borderRadius: 2,
    backgroundColor: colors.primary
  },
  body: { flex: 1, minWidth: 0 },
  title: {
    color: colors.text,
    fontSize: typography.h1,
    fontWeight: "800",
    textAlign: "right"
  },
  subtitle: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: typography.bodySm,
    textAlign: "right"
  }
});

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
    gap: spacing.sm
  },

  // Truck summary
  truckCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...shadows.soft
  },
  truckIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  truckBody: { flex: 1, minWidth: 0 },
  truckName: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: "800",
    textAlign: "right"
  },
  truckMeta: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: typography.caption,
    textAlign: "right"
  },

  // Items
  list: { gap: spacing.sm },
  itemCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.soft
  },
  itemHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  itemName: {
    flex: 1,
    color: colors.text,
    fontWeight: "700",
    fontSize: typography.body,
    textAlign: "right"
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dangerMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  itemFooter: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  qtyGroup: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: radius.pill
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  qtyText: {
    minWidth: 24,
    textAlign: "center",
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.bodySm
  },
  itemPriceBlock: { alignItems: "flex-start" },
  itemLineTotal: {
    color: colors.primaryDark,
    fontWeight: "800",
    fontSize: typography.body
  },
  itemUnitPrice: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: typography.micro
  },

  // Notes
  notesCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm
  },
  notesHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6
  },
  notesTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.bodySm
  },
  notesHint: {
    marginStart: "auto",
    color: colors.textMuted,
    fontSize: typography.micro,
    fontWeight: "600"
  },
  notesInput: {
    minHeight: 70,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.text,
    textAlignVertical: "top",
    fontSize: typography.bodySm
  },

  // Totals
  totalsCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    gap: spacing.xs
  },
  totalRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between"
  },
  totalsDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4
  },
  totalLabel: {
    color: colors.textSecondary,
    fontSize: typography.bodySm
  },
  totalValue: {
    color: colors.text,
    fontWeight: "700",
    fontSize: typography.bodySm
  },
  totalLabelStrong: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800"
  },
  totalValueStrong: {
    color: colors.primary,
    fontSize: typography.h2,
    fontWeight: "900"
  },

  // Actions
  actions: {
    marginTop: spacing.sm,
    gap: spacing.sm
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
    color: colors.danger,
    fontSize: typography.bodySm,
    fontWeight: "700"
  }
});
