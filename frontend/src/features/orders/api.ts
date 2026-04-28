import { apiClient } from "@/api/client";
import type { ApiEnvelope } from "@/api/envelope";

export type PickupOrderItem = {
  id: number;
  truck_id: number;
  order_number: string;
  status: "pending" | "preparing" | "ready" | "picked_up" | "cancelled";
  total_amount: number;
  estimated_ready_minutes: number | null;
  placed_at: string;
  ready_at: string | null;
  picked_up_at: string | null;
  cancelled_at: string | null;
  truck_name: string;
  truck_cover_image_url: string | null;
  item_count: number;
  items: Array<{
    menu_item_id: number;
    menu_item_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    notes: string | null;
  }>;
  review: {
    id: number;
    rating: number;
    comment: string | null;
    created_at: string;
  } | null;
  payment: {
    method: string;
    provider: string | null;
    status: "pending" | "paid" | "failed";
  } | null;
};

export const getMyPickupOrders = async (accessToken: string) => {
  const response = await apiClient.get<ApiEnvelope<{ items: PickupOrderItem[] }>>("/orders/mine", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data.data.items;
};

export const submitOrderReview = async (
  orderId: number,
  payload: {
    rating: number;
    comment?: string;
  },
  accessToken: string
) => {
  const response = await apiClient.post<ApiEnvelope<{ reviewId: number }>>(`/orders/${orderId}/review`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  return response.data.data;
};

export type IncomingPickupOrder = PickupOrderItem & {
  truck_id: number;
  customer_name: string;
  customer_phone?: string | null;
  customer_note?: string | null;
  items?: Array<{
    menu_item_id: number;
    menu_item_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    notes: string | null;
  }>;
};

export type CustomerOrderNotificationItem = {
  id: number;
  title: string;
  body: string;
  type: "order_update" | "system" | "admin_action";
  is_read: boolean;
  metadata_json: string | null;
  created_at: string;
};

export type CreatePickupOrderPayload = {
  truckId: number;
  items: Array<{
    menuItemId: number;
    quantity: number;
    notes?: string;
  }>;
};

export type CreatePickupOrderResponse = {
  orderId: number;
  estimatedReadyMinutes: number;
  pickupOnly: boolean;
};

export type CreateOrderPaymentPayload = {
  method: "card" | "apple_pay" | "mada" | "stc_pay";
};

export type CreateOrderPaymentResponse = {
  orderId: number;
  paymentStatus: "pending" | "paid" | "failed";
  paymentMethod: "card" | "apple_pay" | "mada" | "stc_pay";
  provider: string | null;
  providerReference: string;
};

export const getIncomingOwnerOrders = async (accessToken: string) => {
  const response = await apiClient.get<ApiEnvelope<{ items: IncomingPickupOrder[] }>>("/orders/incoming", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data.data.items;
};

export const createPickupOrder = async (payload: CreatePickupOrderPayload, accessToken: string) => {
  const response = await apiClient.post<ApiEnvelope<CreatePickupOrderResponse>>("/orders", payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data.data;
};

export const createOrderPayment = async (orderId: number, payload: CreateOrderPaymentPayload, accessToken: string) => {
  const response = await apiClient.post<ApiEnvelope<CreateOrderPaymentResponse>>(`/orders/${orderId}/payment`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data.data;
};

export const updatePickupOrderStatus = async (
  orderId: number,
  status: "preparing" | "ready" | "picked_up" | "cancelled",
  accessToken: string
) => {
  await apiClient.patch(
    `/orders/${orderId}/status`,
    { status },
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
};

export const getMyOrderNotifications = async (accessToken: string) => {
  const response = await apiClient.get<ApiEnvelope<{ items: CustomerOrderNotificationItem[] }>>("/orders/mine/notifications", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data.data.items;
};
