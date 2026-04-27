import { AppError } from "../../core/errors";
import type { AuthUser } from "../../core/types/auth";
import { ORDER_STATUS, type OrderStatus } from "../shared/order-status";
import { ROLE_CODES } from "../shared/roles";
import { ordersRepository } from "./orders.repository";

const statusTransitionMap: Record<OrderStatus, OrderStatus[]> = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.READY]: [ORDER_STATUS.PICKED_UP],
  [ORDER_STATUS.PICKED_UP]: [],
  [ORDER_STATUS.CANCELLED]: []
};

const buildOrderNumber = () => {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `PU-${Date.now()}-${randomSuffix}`;
};

const createOrder = async (
  authUser: AuthUser,
  payload: {
    truckId: number;
    items: Array<{ menuItemId: number; quantity: number; notes?: string }>;
  }
) => {
  if (authUser.roleCode !== ROLE_CODES.CUSTOMER) {
    throw new AppError("ORDER_CUSTOMER_ROLE_REQUIRED", { message: "Only customers can place orders" });
  }

  const truck = await ordersRepository.findTruckForOrder(payload.truckId);
  if (!truck) {
    throw new AppError("ORDER_TRUCK_UNAVAILABLE");
  }

  const menuItemIds = [...new Set(payload.items.map((item) => item.menuItemId))];
  const availableItems = await ordersRepository.findAvailableMenuItems(payload.truckId, menuItemIds);
  const priceById = new Map(availableItems.map((item) => [Number(item.id), Number(item.price)]));

  const missingItem = payload.items.find((item) => !priceById.has(item.menuItemId));
  if (missingItem) {
    throw new AppError("ORDER_MENU_ITEM_UNAVAILABLE", {
      message: `Menu item ${missingItem.menuItemId} is not available`,
      details: { menuItemId: missingItem.menuItemId }
    });
  }

  const normalizedItems = payload.items.map((item) => {
    const unitPrice = priceById.get(item.menuItemId) ?? 0;
    const lineTotal = Number((unitPrice * item.quantity).toFixed(2));
    return {
      ...item,
      unitPrice,
      lineTotal
    };
  });

  const subtotalAmount = Number(normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  const estimatedReadyMinutes = 15;
  const orderId = await ordersRepository.createOrderWithItems({
    customerUserId: authUser.userId,
    truckId: payload.truckId,
    orderNumber: buildOrderNumber(),
    subtotalAmount,
    totalAmount: subtotalAmount,
    estimatedReadyMinutes,
    items: normalizedItems
  });

  return { orderId, estimatedReadyMinutes, pickupOnly: true };
};

const listMyOrders = async (authUser: AuthUser) => {
  if (authUser.roleCode !== ROLE_CODES.CUSTOMER) {
    throw new AppError("ORDER_CUSTOMER_ROLE_REQUIRED", { message: "Only customers can access customer orders" });
  }

  const items = await ordersRepository.listCustomerOrders(authUser.userId);
  return { items, pickupOnly: true };
};

const listMyNotifications = async (authUser: AuthUser) => {
  if (authUser.roleCode !== ROLE_CODES.CUSTOMER) {
    throw new AppError("ORDER_CUSTOMER_ROLE_REQUIRED", { message: "Only customers can access notifications" });
  }

  const items = await ordersRepository.listCustomerOrderNotifications(authUser.userId);
  return { items };
};

const listIncomingOrders = async (authUser: AuthUser) => {
  if (authUser.roleCode !== ROLE_CODES.TRUCK_OWNER && authUser.roleCode !== ROLE_CODES.ADMIN) {
    throw new AppError("ORDER_STAFF_ROLE_REQUIRED", {
      message: "Only truck owners and admins can access incoming orders"
    });
  }

  const items =
    authUser.roleCode === ROLE_CODES.ADMIN
      ? []
      : await ordersRepository.listIncomingOrdersForOwner(authUser.userId);
  return { items, pickupOnly: true };
};

const updateOrderStatus = async (orderId: number, nextStatus: OrderStatus, authUser: AuthUser) => {
  if (authUser.roleCode !== ROLE_CODES.TRUCK_OWNER && authUser.roleCode !== ROLE_CODES.ADMIN) {
    throw new AppError("ORDER_STAFF_ROLE_REQUIRED", {
      message: "Only truck owners and admins can update order status"
    });
  }

  const order = await ordersRepository.findOrderOwner(orderId);
  if (!order) {
    throw new AppError("ORDER_NOT_FOUND");
  }

  if (authUser.roleCode === ROLE_CODES.TRUCK_OWNER && Number(order.owner_user_id) !== authUser.userId) {
    throw new AppError("ORDER_OWNERSHIP_REQUIRED");
  }

  const currentStatus = order.status as OrderStatus;
  const allowedTransitions = statusTransitionMap[currentStatus];
  if (!allowedTransitions.includes(nextStatus)) {
    throw new AppError("ORDER_INVALID_STATUS_TRANSITION", {
      message: `Invalid status transition from ${currentStatus} to ${nextStatus}`,
      details: { from: currentStatus, to: nextStatus }
    });
  }

  await ordersRepository.updateOrderStatus(orderId, nextStatus);
  const customerMessageByStatus: Partial<Record<OrderStatus, { title: string; body: string }>> = {
    [ORDER_STATUS.PREPARING]: {
      title: "طلبك قيد التحضير",
      body: `تم بدء تجهيز طلبك رقم ${order.order_number ?? `#${orderId}`}.`
    },
    [ORDER_STATUS.READY]: {
      title: "طلبك جاهز للاستلام",
      body: `طلبك رقم ${order.order_number ?? `#${orderId}`} صار جاهز. تقدر تتجه للفود ترك الآن.`
    },
    [ORDER_STATUS.CANCELLED]: {
      title: "تم إلغاء الطلب",
      body: `تم إلغاء طلبك رقم ${order.order_number ?? `#${orderId}`}.`
    },
    [ORDER_STATUS.PICKED_UP]: {
      title: "تم تسليم الطلب",
      body: `تم تسجيل استلام طلبك رقم ${order.order_number ?? `#${orderId}`}. بالهناء!`
    }
  };
  const notification = customerMessageByStatus[nextStatus];
  if (notification) {
    await ordersRepository.createOrderNotification({
      userId: Number(order.customer_user_id),
      title: notification.title,
      body: notification.body,
      metadata: {
        orderId,
        truckId: Number(order.truck_id),
        status: nextStatus
      }
    });
  }
  return { orderId, status: nextStatus, pickupOnly: true };
};

const createOrderReview = async (
  authUser: AuthUser,
  orderId: number,
  payload: {
    rating: number;
    comment?: string;
  }
) => {
  if (authUser.roleCode !== ROLE_CODES.CUSTOMER) {
    throw new AppError("ORDER_CUSTOMER_ROLE_REQUIRED", { message: "Only customers can submit order reviews" });
  }

  const order = await ordersRepository.findCustomerOrderById(orderId, authUser.userId);
  if (!order) {
    throw new AppError("ORDER_NOT_FOUND");
  }

  if (order.status !== ORDER_STATUS.PICKED_UP) {
    throw new AppError("ORDER_REVIEW_NOT_ELIGIBLE");
  }

  const existingReview = await ordersRepository.findReviewByOrderAndUser(orderId, authUser.userId);
  if (existingReview) {
    throw new AppError("ORDER_ALREADY_REVIEWED");
  }

  const reviewId = await ordersRepository.createReviewForOrder({
    userId: authUser.userId,
    truckId: Number(order.truck_id),
    orderId: Number(order.id),
    rating: payload.rating,
    comment: payload.comment
  });

  const aggregate = await ordersRepository.getTruckReviewAggregate(Number(order.truck_id));
  await ordersRepository.updateTruckRatingAggregate(Number(order.truck_id), aggregate);

  return {
    reviewId,
    orderId: Number(order.id),
    rating: payload.rating,
    comment: payload.comment?.trim() || null
  };
};

const mapPaymentStorage = (
  method: "card" | "apple_pay" | "mada" | "stc_pay"
): {
  method: "card" | "apple_pay" | "cash";
  provider: string | null;
} => {
  if (method === "apple_pay") {
    return { method: "apple_pay", provider: "apple_pay" };
  }

  if (method === "mada") {
    return { method: "card", provider: "mada" };
  }

  if (method === "stc_pay") {
    return { method: "card", provider: "stc_pay" };
  }

  return { method: "card", provider: "card" };
};

const resolvePaymentStatus = (): "paid" => {
  // MVP mode: without real PSP async callbacks, any successful order+payment request is treated as paid.
  return "paid";
};

const createOrderPayment = async (
  authUser: AuthUser,
  orderId: number,
  payload: { method: "card" | "apple_pay" | "mada" | "stc_pay" }
) => {
  if (authUser.roleCode !== ROLE_CODES.CUSTOMER) {
    throw new AppError("ORDER_CUSTOMER_ROLE_REQUIRED", { message: "Only customers can pay for pickup orders" });
  }

  const order = await ordersRepository.findCustomerOrderById(orderId, authUser.userId);
  if (!order) {
    throw new AppError("ORDER_NOT_FOUND");
  }

  if (order.status === ORDER_STATUS.CANCELLED) {
    throw new AppError("ORDER_CANCELLED_CANNOT_PAY");
  }

  const orderRow = await ordersRepository.findOrderById(orderId);
  const paidAmount = Number(orderRow?.total_amount ?? 0);
  const mapped = mapPaymentStorage(payload.method);
  const status = resolvePaymentStatus();
  const providerReference = `sandbox-${payload.method}-${Date.now()}`;

  const existingPayment = await ordersRepository.findPaymentByOrderId(orderId);
  if (existingPayment) {
    await ordersRepository.updatePaymentForOrder(orderId, {
      method: mapped.method,
      provider: mapped.provider,
      status,
      paidAmount,
      providerReference
    });
  } else {
    await ordersRepository.createPaymentForOrder({
      orderId,
      method: mapped.method,
      provider: mapped.provider,
      status,
      paidAmount,
      providerReference
    });
  }

  await ordersRepository.touchOrderUpdatedAt(orderId);
  await ordersRepository.createOrderNotification({
    userId: authUser.userId,
    title: "تم تأكيد الدفع",
    body: `تم تأكيد دفع طلبك رقم ${order.order_number}.`,
    metadata: { orderId, paymentMethod: payload.method, paymentStatus: status }
  });

  return {
    orderId: Number(order.id),
    paymentStatus: status,
    paymentMethod: payload.method,
    provider: mapped.provider,
    providerReference
  };
};

export const ordersService = {
  createOrder,
  listMyOrders,
  listMyNotifications,
  listIncomingOrders,
  updateOrderStatus,
  createOrderReview,
  createOrderPayment
};
