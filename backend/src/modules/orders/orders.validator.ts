import { z } from "zod";

import { ORDER_STATUS } from "../shared/order-status";

export const createOrderSchema = z.object({
  truckId: z.number().int().positive(),
  items: z
    .array(
      z.object({
        menuItemId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(20),
        notes: z.string().max(300).optional()
      })
    )
    .min(1)
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.PICKED_UP, ORDER_STATUS.CANCELLED])
});

export const createOrderReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(700).optional()
});

export const createOrderPaymentSchema = z.object({
  method: z.enum(["card", "apple_pay", "mada", "stc_pay"])
});
