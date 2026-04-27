import { db } from "../../core/db/connection";
import { ORDER_STATUS } from "../shared/order-status";

type CreateOrderInput = {
  customerUserId: number;
  truckId: number;
  orderNumber: string;
  subtotalAmount: number;
  totalAmount: number;
  estimatedReadyMinutes: number | null;
  items: Array<{
    menuItemId: number;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    notes?: string;
  }>;
};

const findTruckForOrder = async (truckId: number) => {
  return db("food_trucks").where({ id: truckId, approval_status: "approved" }).whereNull("deleted_at").first();
};

const findAvailableMenuItems = async (truckId: number, menuItemIds: number[]) => {
  return db("menu_items")
    .select("id", "price", "name")
    .where({ truck_id: truckId, is_available: 1 })
    .whereIn("id", menuItemIds)
    .whereNull("deleted_at");
};

const createOrderWithItems = async (payload: CreateOrderInput): Promise<number> => {
  return db.transaction(async (trx) => {
    const [orderIdRaw] = await trx("orders").insert({
      customer_user_id: payload.customerUserId,
      truck_id: payload.truckId,
      order_number: payload.orderNumber,
      status: ORDER_STATUS.PENDING,
      subtotal_amount: payload.subtotalAmount,
      tax_amount: 0,
      service_fee_amount: 0,
      total_amount: payload.totalAmount,
      estimated_ready_minutes: payload.estimatedReadyMinutes
    });

    const orderId = Number(orderIdRaw);
    await trx("order_items").insert(
      payload.items.map((item) => ({
        order_id: orderId,
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        line_total: item.lineTotal,
        notes: item.notes ?? null
      }))
    );

    return orderId;
  });
};

const listCustomerOrders = async (customerUserId: number) => {
  const orders = await db("orders as o")
    .join("food_trucks as ft", "ft.id", "o.truck_id")
    .leftJoin("reviews as r", function joinOrderReview() {
      this.on("r.order_id", "=", "o.id").andOn("r.user_id", "=", db.raw("?", [customerUserId]));
    })
    .select(
      "o.id",
      "o.truck_id",
      "o.order_number",
      "o.status",
      "o.total_amount",
      "o.estimated_ready_minutes",
      "o.placed_at",
      "ft.display_name as truck_name"
    )
    .select(
      "o.ready_at",
      "o.picked_up_at",
      "o.cancelled_at",
      "ft.cover_image_url as truck_cover_image_url",
      "p.method as payment_method",
      "p.provider as payment_provider",
      "p.status as payment_status",
      "r.id as review_id",
      "r.rating as review_rating",
      "r.comment as review_comment",
      "r.created_at as review_created_at"
    )
    .leftJoin("payments as p", "p.order_id", "o.id")
    .where("o.customer_user_id", customerUserId)
    .orderBy("o.placed_at", "desc");

  if (orders.length === 0) {
    return [];
  }

  const orderIds = orders.map((order) => Number(order.id));
  const orderItems = await db("order_items as oi")
    .join("menu_items as mi", "mi.id", "oi.menu_item_id")
    .select(
      "oi.order_id",
      "oi.menu_item_id",
      "oi.quantity",
      "oi.unit_price",
      "oi.line_total",
      "oi.notes",
      "mi.name as menu_item_name"
    )
    .whereIn("oi.order_id", orderIds)
    .orderBy("oi.id", "asc");

  const itemsByOrderId = new Map<number, typeof orderItems>();
  orderItems.forEach((item) => {
    const orderId = Number(item.order_id);
    const existing = itemsByOrderId.get(orderId) ?? [];
    existing.push(item);
    itemsByOrderId.set(orderId, existing);
  });

  return orders.map((order) => {
    const items = (itemsByOrderId.get(Number(order.id)) ?? []).map((item) => ({
      menu_item_id: Number(item.menu_item_id),
      menu_item_name: item.menu_item_name,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      line_total: Number(item.line_total),
      notes: item.notes ?? null
    }));

    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      ...order,
      item_count: itemCount,
      items,
      payment: order.payment_status
        ? {
            method: String(order.payment_method),
            provider: order.payment_provider ? String(order.payment_provider) : null,
            status: String(order.payment_status)
          }
        : null,
      review:
        order.review_id == null
          ? null
          : {
              id: Number(order.review_id),
              rating: Number(order.review_rating),
              comment: order.review_comment ?? null,
              created_at: order.review_created_at
            }
    };
  });
};

const listIncomingOrdersForOwner = async (ownerUserId: number) => {
  const orders = await db("orders as o")
    .join("food_trucks as ft", "ft.id", "o.truck_id")
    .join("users as u", "u.id", "o.customer_user_id")
    .leftJoin("reviews as r", "r.order_id", "o.id")
    .select(
      "o.id",
      "o.order_number",
      "o.status",
      "o.total_amount",
      "o.estimated_ready_minutes",
      "o.placed_at",
      "o.truck_id",
      "ft.display_name as truck_name",
      "u.full_name as customer_name",
      "u.phone as customer_phone",
      "r.id as review_id",
      "r.rating as review_rating",
      "r.comment as review_comment",
      "r.created_at as review_created_at"
    )
    .where("ft.owner_user_id", ownerUserId)
    .whereIn("o.status", [ORDER_STATUS.PENDING, ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.PICKED_UP])
    .orderBy("o.placed_at", "asc");

  if (orders.length === 0) {
    return [];
  }

  const orderIds = orders.map((order) => Number(order.id));
  const orderItems = await db("order_items as oi")
    .join("menu_items as mi", "mi.id", "oi.menu_item_id")
    .select(
      "oi.order_id",
      "oi.menu_item_id",
      "oi.quantity",
      "oi.unit_price",
      "oi.line_total",
      "oi.notes",
      "mi.name as menu_item_name"
    )
    .whereIn("oi.order_id", orderIds)
    .orderBy("oi.id", "asc");

  const itemsByOrderId = new Map<number, typeof orderItems>();
  orderItems.forEach((item) => {
    const orderId = Number(item.order_id);
    const existing = itemsByOrderId.get(orderId) ?? [];
    existing.push(item);
    itemsByOrderId.set(orderId, existing);
  });

  return orders.map((order) => {
    const items = (itemsByOrderId.get(Number(order.id)) ?? []).map((item) => ({
      menu_item_id: Number(item.menu_item_id),
      menu_item_name: item.menu_item_name,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      line_total: Number(item.line_total),
      notes: item.notes ?? null
    }));

    const customerNotes = Array.from(
      new Set(
        items
          .map((item) => item.notes?.trim())
          .filter((note): note is string => Boolean(note))
      )
    );

    return {
      ...order,
      customer_note: customerNotes.length > 0 ? customerNotes.join(" • ") : null,
      items,
      review:
        order.review_id == null
          ? null
          : {
              id: Number(order.review_id),
              rating: Number(order.review_rating),
              comment: order.review_comment ?? null,
              created_at: order.review_created_at
            }
    };
  });
};

const findOrderById = async (orderId: number) => {
  return db("orders").where({ id: orderId }).first();
};

const findOrderOwner = async (orderId: number) => {
  return db("orders as o")
    .join("food_trucks as ft", "ft.id", "o.truck_id")
    .select("o.id", "o.status", "o.truck_id", "o.customer_user_id", "o.order_number", "ft.owner_user_id")
    .where("o.id", orderId)
    .first();
};

const updateOrderStatus = async (orderId: number, status: string): Promise<void> => {
  const updatePayload: Record<string, unknown> = { status };
  if (status === ORDER_STATUS.READY) {
    const hasReadyAt = await db.schema.hasColumn("orders", "ready_at");
    if (hasReadyAt) updatePayload.ready_at = db.fn.now();
  }
  if (status === ORDER_STATUS.PICKED_UP) {
    const hasPickedUpAt = await db.schema.hasColumn("orders", "picked_up_at");
    if (hasPickedUpAt) {
      updatePayload.picked_up_at = db.fn.now();
    } else {
      // Legacy DBs may still use completed_at instead of picked_up_at.
      const hasCompletedAt = await db.schema.hasColumn("orders", "completed_at");
      if (hasCompletedAt) updatePayload.completed_at = db.fn.now();
    }
  }
  if (status === ORDER_STATUS.CANCELLED) {
    const hasCancelledAt = await db.schema.hasColumn("orders", "cancelled_at");
    if (hasCancelledAt) updatePayload.cancelled_at = db.fn.now();
  }

  await db("orders").where({ id: orderId }).update(updatePayload);
};

const createOrderNotification = async (payload: {
  userId: number;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}) => {
  await db("notifications").insert({
    user_id: payload.userId,
    type: "order_update",
    title: payload.title,
    body: payload.body,
    metadata_json: payload.metadata ? JSON.stringify(payload.metadata) : null,
    is_read: 0
  });
};

const listCustomerOrderNotifications = async (customerUserId: number, limit = 30) => {
  return db("notifications")
    .select("id", "title", "body", "type", "is_read", "metadata_json", "created_at")
    .where({ user_id: customerUserId, type: "order_update" })
    .orderBy("created_at", "desc")
    .limit(limit);
};

const findCustomerOrderById = async (orderId: number, customerUserId: number) => {
  return db("orders")
    .select("id", "order_number", "status", "truck_id", "customer_user_id", "picked_up_at")
    .where({ id: orderId, customer_user_id: customerUserId })
    .first();
};

const findPaymentByOrderId = async (orderId: number) => {
  return db("payments")
    .where({ order_id: orderId })
    .first("id", "order_id", "method", "provider", "status", "provider_reference");
};

const createPaymentForOrder = async (payload: {
  orderId: number;
  method: "card" | "apple_pay" | "cash";
  provider: string | null;
  status: "pending" | "paid" | "failed";
  paidAmount: number;
  providerReference: string;
}) => {
  const [paymentIdRaw] = await db("payments").insert({
    order_id: payload.orderId,
    method: payload.method,
    provider: payload.provider,
    provider_reference: payload.providerReference,
    status: payload.status,
    paid_amount: payload.paidAmount,
    paid_at: payload.status === "paid" ? db.fn.now() : null
  });
  return Number(paymentIdRaw);
};

const updatePaymentForOrder = async (
  orderId: number,
  payload: {
    method: "card" | "apple_pay" | "cash";
    provider: string | null;
    status: "pending" | "paid" | "failed";
    paidAmount: number;
    providerReference: string;
  }
) => {
  await db("payments").where({ order_id: orderId }).update({
    method: payload.method,
    provider: payload.provider,
    provider_reference: payload.providerReference,
    status: payload.status,
    paid_amount: payload.paidAmount,
    paid_at: payload.status === "paid" ? db.fn.now() : null,
    updated_at: db.fn.now()
  });
};

const touchOrderUpdatedAt = async (orderId: number) => {
  await db("orders").where({ id: orderId }).update({ updated_at: db.fn.now() });
};

const findReviewByOrderAndUser = async (orderId: number, userId: number) => {
  return db("reviews").where({ order_id: orderId, user_id: userId }).first("id", "rating", "comment", "created_at");
};

const createReviewForOrder = async (payload: {
  userId: number;
  truckId: number;
  orderId: number;
  rating: number;
  comment?: string;
}) => {
  const [reviewIdRaw] = await db("reviews").insert({
    user_id: payload.userId,
    truck_id: payload.truckId,
    order_id: payload.orderId,
    rating: payload.rating,
    comment: payload.comment?.trim() || null
  });
  return Number(reviewIdRaw);
};

const getTruckReviewAggregate = async (truckId: number) => {
  const row = await db("reviews")
    .where({ truck_id: truckId })
    .select(db.raw("COUNT(*) as count"), db.raw("COALESCE(AVG(rating), 0) as avg_rating"))
    .first<{ count: number | string; avg_rating: number | string }>();

  return {
    ratingCount: Number(row?.count ?? 0),
    avgRating: Number(row?.avg_rating ?? 0)
  };
};

const updateTruckRatingAggregate = async (truckId: number, aggregate: { ratingCount: number; avgRating: number }) => {
  await db("food_trucks").where({ id: truckId }).update({
    rating_count: aggregate.ratingCount,
    avg_rating: Number(aggregate.avgRating.toFixed(2))
  });
};

export const ordersRepository = {
  findTruckForOrder,
  findAvailableMenuItems,
  createOrderWithItems,
  listCustomerOrders,
  listIncomingOrdersForOwner,
  findOrderById,
  findOrderOwner,
  updateOrderStatus,
  createOrderNotification,
  listCustomerOrderNotifications,
  findCustomerOrderById,
  findPaymentByOrderId,
  findReviewByOrderAndUser,
  createReviewForOrder,
  getTruckReviewAggregate,
  updateTruckRatingAggregate,
  createPaymentForOrder,
  updatePaymentForOrder,
  touchOrderUpdatedAt
};
