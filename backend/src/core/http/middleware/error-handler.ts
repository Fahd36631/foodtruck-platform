import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { AppError, ERROR_CATALOG } from "../../errors";
import { logger } from "../../logger/logger";
import { fail } from "../api-response";

const isDuplicateEntryError = (error: unknown): error is { code: string; sqlMessage?: string } => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ER_DUP_ENTRY"
  );
};

const getDuplicateEntryMessage = (error: { sqlMessage?: string }): string => {
  const rawMessage = String(error.sqlMessage ?? "");

  if (rawMessage.includes("users.email")) {
    return "البريد الإلكتروني مستخدم مسبقًا.";
  }
  if (rawMessage.includes("users.phone")) {
    return "رقم الجوال مستخدم مسبقًا.";
  }
  if (rawMessage.includes("municipal_licenses.license_number")) {
    return "رقم الرخصة مستخدم مسبقًا لطلب آخر.";
  }
  if (rawMessage.includes("food_trucks.slug")) {
    return "اسم الفود ترك مستخدم مسبقًا، جرّب اسمًا مختلفًا.";
  }

  return ERROR_CATALOG.DUPLICATE_ENTRY.message;
};

/**
 * Global error handler. Maps any thrown error into the canonical ApiFailure
 * envelope: { success: false, message, error: { code, details? } }.
 */
export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  if (error instanceof ZodError) {
    const def = ERROR_CATALOG.VALIDATION_ERROR;
    res.status(def.status).json(
      fail(def.message, {
        code: "VALIDATION_ERROR",
        details: error.flatten()
      })
    );
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json(
      fail(error.message, {
        code: error.code,
        details: error.details
      })
    );
    return;
  }

  if (isDuplicateEntryError(error)) {
    const def = ERROR_CATALOG.DUPLICATE_ENTRY;
    res.status(def.status).json(
      fail(getDuplicateEntryMessage(error), {
        code: "DUPLICATE_ENTRY"
      })
    );
    return;
  }

  logger.error({ error }, "Unhandled error");
  const def = ERROR_CATALOG.INTERNAL_ERROR;
  res.status(def.status).json(fail(def.message, { code: "INTERNAL_ERROR" }));
};
