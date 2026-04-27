import { z } from "zod";

export const listMenuItemsQuerySchema = z.object({
  truckId: z.coerce.number().int().positive()
});

export const createMenuItemSchema = z.object({
  truckId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  name: z.string().min(2).max(140),
  description: z.string().max(1500).optional(),
  price: z.number().positive(),
  imageUrl: z.string().url().optional(),
  isAvailable: z.boolean().default(true)
});

export const updateMenuItemSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  name: z.string().min(2).max(140).optional(),
  description: z.string().max(1500).optional(),
  price: z.number().positive().optional(),
  imageUrl: z.string().url().optional(),
  isAvailable: z.boolean().optional()
});
