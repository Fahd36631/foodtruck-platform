import { z } from "zod";

import { TRUCK_APPROVAL_STATUS, TRUCK_OPERATIONAL_STATUS } from "../shared/truck-status";

export const registerTruckSchema = z.object({
  displayName: z.string().min(2).max(140),
  categoryName: z.string().min(2).max(100),
  description: z.string().max(1500).optional(),
  workingHours: z.string().min(2).max(200),
  contactPhone: z.string().min(8).max(30),
  coverImageUrl: z.string().url().optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    neighborhood: z.string().min(2).max(120),
    city: z.string().min(2).max(120)
  }),
  license: z.object({
    licenseNumber: z.string().min(3).max(80),
    documentUrl: z.string().url(),
    expiresAt: z.string()
  })
});

export const updateTruckProfileSchema = z.object({
  displayName: z.string().min(2).max(140).optional(),
  description: z.string().max(1500).optional(),
  coverImageUrl: z.string().url().optional(),
  workingHours: z.string().min(2).max(200).optional()
});

export const updateTruckLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  neighborhood: z.string().min(2).max(120),
  city: z.string().min(2).max(120)
});

export const updateTruckStatusSchema = z.object({
  status: z.enum([
    TRUCK_OPERATIONAL_STATUS.OPEN,
    TRUCK_OPERATIONAL_STATUS.BUSY,
    TRUCK_OPERATIONAL_STATUS.CLOSED,
    TRUCK_OPERATIONAL_STATUS.OFFLINE
  ])
});

export const decisionTruckApprovalSchema = z
  .object({
    decision: z.enum([TRUCK_APPROVAL_STATUS.APPROVED, TRUCK_APPROVAL_STATUS.REJECTED]),
    reviewNote: z.string().max(500).optional()
  })
  .superRefine((value, ctx) => {
    if (value.decision === TRUCK_APPROVAL_STATUS.REJECTED && !value.reviewNote?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Review note is required when rejecting a truck",
        path: ["reviewNote"]
      });
    }
  });

export const discoveryQuerySchema = z.object({
  city: z.string().min(2).max(120).optional(),
  neighborhood: z.string().min(2).max(120).optional(),
  categoryId: z.coerce.number().int().positive().optional()
});
