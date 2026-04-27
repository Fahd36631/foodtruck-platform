import { ERROR_CATALOG, type ErrorCode } from "./error-codes";

type AppErrorOptions = {
  /** Override the default message from the catalog. */
  message?: string;
  /** Override the default HTTP status from the catalog. */
  status?: number;
  /** Optional machine-readable extra context (validation issues, ids, etc.). */
  details?: unknown;
};

/**
 * Application-level error carrying a stable `code` in addition to HTTP status.
 *
 * Usage:
 *   throw new AppError("AUTH_INVALID_CREDENTIALS");
 *   throw new AppError("TRUCK_NOT_FOUND", { message: "Truck #42 not found" });
 *   throw new AppError("ORDER_INVALID_STATUS_TRANSITION", {
 *     message: `Cannot move order from ${from} to ${to}`,
 *     details: { from, to }
 *   });
 *
 * The `code` is the source of truth for logging / monitoring / frontend mapping.
 * The `message` is a human-readable default that callers may override.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, options: AppErrorOptions = {}) {
    const definition = ERROR_CATALOG[code];
    super(options.message ?? definition.message);
    this.name = "AppError";
    this.code = code;
    this.status = options.status ?? definition.status;
    this.details = options.details;
  }
}
