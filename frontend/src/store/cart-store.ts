import { create } from "zustand";

type CartItem = {
  menuItemId: number;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
};

type SetTruckPayload = {
  truckId: number;
  truckName: string;
};

type AddItemPayload = SetTruckPayload & {
  menuItemId: number;
  name: string;
  price: number;
  imageUrl: string | null;
};

type CartState = {
  truckId: number | null;
  truckName: string;
  items: CartItem[];
  notes: string;
  itemCount: number;
  subtotal: number;
  total: number;
  pickupTypeLabel: string;
  canAddFromTruck: (truckId: number) => boolean;
  addItem: (payload: AddItemPayload) => void;
  incrementItem: (menuItemId: number) => void;
  decrementItem: (menuItemId: number) => void;
  removeItem: (menuItemId: number) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
};

const normalizeMoney = (value: number) => Number(value.toFixed(2));

const deriveTotals = (items: CartItem[]) => {
  const subtotal = normalizeMoney(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { subtotal, itemCount, total: subtotal };
};

const EMPTY_CART = {
  truckId: null,
  truckName: "",
  items: [],
  notes: "",
  itemCount: 0,
  subtotal: 0,
  total: 0
};

export const useCartStore = create<CartState>((set, get) => ({
  ...EMPTY_CART,
  pickupTypeLabel: "استلام من الترك فقط",
  canAddFromTruck: (truckId) => {
    const currentTruckId = get().truckId;
    return currentTruckId === null || currentTruckId === truckId;
  },
  addItem: ({ truckId, truckName, menuItemId, name, price, imageUrl }) => {
    const state = get();
    if (state.truckId !== null && state.truckId !== truckId) {
      return;
    }

    const nextItems = [...state.items];
    const existing = nextItems.find((item) => item.menuItemId === menuItemId);
    if (existing) {
      existing.quantity += 1;
    } else {
      nextItems.push({ menuItemId, name, price, imageUrl, quantity: 1 });
    }

    const totals = deriveTotals(nextItems);
    set({
      truckId,
      truckName,
      items: nextItems,
      ...totals
    });
  },
  incrementItem: (menuItemId) => {
    const state = get();
    const nextItems = state.items.map((item) =>
      item.menuItemId === menuItemId ? { ...item, quantity: Math.min(item.quantity + 1, 20) } : item
    );
    const totals = deriveTotals(nextItems);
    set({ items: nextItems, ...totals });
  },
  decrementItem: (menuItemId) => {
    const state = get();
    const nextItems = state.items
      .map((item) => (item.menuItemId === menuItemId ? { ...item, quantity: item.quantity - 1 } : item))
      .filter((item) => item.quantity > 0);
    const totals = deriveTotals(nextItems);
    set({
      items: nextItems,
      ...totals,
      ...(nextItems.length === 0 ? { truckId: null, truckName: "", notes: "" } : {})
    });
  },
  removeItem: (menuItemId) => {
    const state = get();
    const nextItems = state.items.filter((item) => item.menuItemId !== menuItemId);
    const totals = deriveTotals(nextItems);
    set({
      items: nextItems,
      ...totals,
      ...(nextItems.length === 0 ? { truckId: null, truckName: "", notes: "" } : {})
    });
  },
  setNotes: (notes) => set({ notes }),
  clearCart: () => set({ ...EMPTY_CART })
}));
