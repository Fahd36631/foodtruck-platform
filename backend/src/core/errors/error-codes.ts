import { StatusCodes } from "http-status-codes";

/**
 * Central catalog of all application error codes.
 *
 * Every thrown AppError MUST reference a code from this catalog.
 * The catalog is the single source of truth for:
 *   - stable identifier (for logs / monitoring / frontend mapping)
 *   - default HTTP status
 *   - default human-readable message
 *
 * Callers can override `message` or `status` per-throw, but the code stays stable.
 */
export const ERROR_CODES = {
  // -------- Generic --------
  INTERNAL_ERROR: "INTERNAL_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
  DUPLICATE_ENTRY: "DUPLICATE_ENTRY",

  // -------- Auth --------
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  AUTH_FORBIDDEN: "AUTH_FORBIDDEN",
  AUTH_INVALID_TOKEN: "AUTH_INVALID_TOKEN",
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_EMAIL_TAKEN: "AUTH_EMAIL_TAKEN",
  AUTH_PHONE_TAKEN: "AUTH_PHONE_TAKEN",
  AUTH_USER_NOT_FOUND: "AUTH_USER_NOT_FOUND",
  AUTH_CURRENT_PASSWORD_INVALID: "AUTH_CURRENT_PASSWORD_INVALID",
  AUTH_ROLE_NOT_CONFIGURED: "AUTH_ROLE_NOT_CONFIGURED",

  // -------- Trucks --------
  TRUCK_NOT_FOUND: "TRUCK_NOT_FOUND",
  TRUCK_OWNERSHIP_REQUIRED: "TRUCK_OWNERSHIP_REQUIRED",
  TRUCK_OWNER_ROLE_REQUIRED: "TRUCK_OWNER_ROLE_REQUIRED",
  TRUCK_PENDING_REQUEST_EXISTS: "TRUCK_PENDING_REQUEST_EXISTS",
  TRUCK_NOT_APPROVED: "TRUCK_NOT_APPROVED",
  TRUCK_ALREADY_REVIEWED: "TRUCK_ALREADY_REVIEWED",
  TRUCK_REJECTION_REASON_REQUIRED: "TRUCK_REJECTION_REASON_REQUIRED",
  TRUCK_ADMIN_ROLE_REQUIRED: "TRUCK_ADMIN_ROLE_REQUIRED",

  // -------- Menus --------
  MENU_ITEM_NOT_FOUND: "MENU_ITEM_NOT_FOUND",
  MENU_OWNERSHIP_REQUIRED: "MENU_OWNERSHIP_REQUIRED",

  // -------- Orders --------
  ORDER_NOT_FOUND: "ORDER_NOT_FOUND",
  ORDER_TRUCK_UNAVAILABLE: "ORDER_TRUCK_UNAVAILABLE",
  ORDER_MENU_ITEM_UNAVAILABLE: "ORDER_MENU_ITEM_UNAVAILABLE",
  ORDER_OWNERSHIP_REQUIRED: "ORDER_OWNERSHIP_REQUIRED",
  ORDER_INVALID_STATUS_TRANSITION: "ORDER_INVALID_STATUS_TRANSITION",
  ORDER_CUSTOMER_ROLE_REQUIRED: "ORDER_CUSTOMER_ROLE_REQUIRED",
  ORDER_STAFF_ROLE_REQUIRED: "ORDER_STAFF_ROLE_REQUIRED",
  ORDER_REVIEW_NOT_ELIGIBLE: "ORDER_REVIEW_NOT_ELIGIBLE",
  ORDER_ALREADY_REVIEWED: "ORDER_ALREADY_REVIEWED",
  ORDER_CANCELLED_CANNOT_PAY: "ORDER_CANCELLED_CANNOT_PAY",

  // -------- Uploads --------
  UPLOAD_FILE_MISSING: "UPLOAD_FILE_MISSING"
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export type ErrorDefinition = {
  status: number;
  message: string;
};

/**
 * Default HTTP status + human-readable message for each error code.
 * Messages here are the defaults; call sites MAY override per-throw.
 */
export const ERROR_CATALOG: Record<ErrorCode, ErrorDefinition> = {
  // Generic
  INTERNAL_ERROR: { status: StatusCodes.INTERNAL_SERVER_ERROR, message: "Internal server error" },
  VALIDATION_ERROR: { status: StatusCodes.UNPROCESSABLE_ENTITY, message: "Validation failed" },
  ROUTE_NOT_FOUND: { status: StatusCodes.NOT_FOUND, message: "Route not found" },
  DUPLICATE_ENTRY: { status: StatusCodes.CONFLICT, message: "يوجد بيانات مكررة لا يمكن حفظها." },

  // Auth
  AUTH_UNAUTHORIZED: { status: StatusCodes.UNAUTHORIZED, message: "Unauthorized" },
  AUTH_FORBIDDEN: { status: StatusCodes.FORBIDDEN, message: "Forbidden" },
  AUTH_INVALID_TOKEN: { status: StatusCodes.UNAUTHORIZED, message: "Invalid or expired token" },
  AUTH_INVALID_CREDENTIALS: { status: StatusCodes.UNAUTHORIZED, message: "Invalid credentials" },
  AUTH_EMAIL_TAKEN: { status: StatusCodes.CONFLICT, message: "Email is already registered" },
  AUTH_PHONE_TAKEN: { status: StatusCodes.CONFLICT, message: "Phone is already registered" },
  AUTH_USER_NOT_FOUND: { status: StatusCodes.NOT_FOUND, message: "User not found" },
  AUTH_CURRENT_PASSWORD_INVALID: { status: StatusCodes.UNAUTHORIZED, message: "Current password is incorrect" },
  AUTH_ROLE_NOT_CONFIGURED: { status: StatusCodes.INTERNAL_SERVER_ERROR, message: "Selected role is not configured" },

  // Trucks
  TRUCK_NOT_FOUND: { status: StatusCodes.NOT_FOUND, message: "Truck not found" },
  TRUCK_OWNERSHIP_REQUIRED: { status: StatusCodes.FORBIDDEN, message: "You can only manage your own truck" },
  TRUCK_OWNER_ROLE_REQUIRED: { status: StatusCodes.FORBIDDEN, message: "Only truck owners can perform this action" },
  TRUCK_PENDING_REQUEST_EXISTS: {
    status: StatusCodes.CONFLICT,
    message: "لديك طلب قيد المراجعة بالفعل. لا يمكنك إرسال طلب جديد قبل صدور قرار الإدارة."
  },
  TRUCK_NOT_APPROVED: { status: StatusCodes.CONFLICT, message: "Truck must be approved before this action" },
  TRUCK_ALREADY_REVIEWED: { status: StatusCodes.CONFLICT, message: "Truck already reviewed" },
  TRUCK_REJECTION_REASON_REQUIRED: { status: StatusCodes.BAD_REQUEST, message: "Rejection reason is required" },
  TRUCK_ADMIN_ROLE_REQUIRED: { status: StatusCodes.FORBIDDEN, message: "Only admins can perform this action" },

  // Menus
  MENU_ITEM_NOT_FOUND: { status: StatusCodes.NOT_FOUND, message: "Menu item not found" },
  MENU_OWNERSHIP_REQUIRED: { status: StatusCodes.FORBIDDEN, message: "You can only manage menu for your own truck" },

  // Orders
  ORDER_NOT_FOUND: { status: StatusCodes.NOT_FOUND, message: "Order not found" },
  ORDER_TRUCK_UNAVAILABLE: { status: StatusCodes.NOT_FOUND, message: "Truck not available for ordering" },
  ORDER_MENU_ITEM_UNAVAILABLE: { status: StatusCodes.BAD_REQUEST, message: "Menu item is not available" },
  ORDER_OWNERSHIP_REQUIRED: { status: StatusCodes.FORBIDDEN, message: "You can only manage orders from your own truck" },
  ORDER_INVALID_STATUS_TRANSITION: { status: StatusCodes.CONFLICT, message: "Invalid order status transition" },
  ORDER_CUSTOMER_ROLE_REQUIRED: { status: StatusCodes.FORBIDDEN, message: "Only customers can perform this action" },
  ORDER_STAFF_ROLE_REQUIRED: {
    status: StatusCodes.FORBIDDEN,
    message: "Only truck owners and admins can perform this action"
  },
  ORDER_REVIEW_NOT_ELIGIBLE: {
    status: StatusCodes.CONFLICT,
    message: "Review is only available for completed pickup orders"
  },
  ORDER_ALREADY_REVIEWED: { status: StatusCodes.CONFLICT, message: "You already reviewed this order" },
  ORDER_CANCELLED_CANNOT_PAY: { status: StatusCodes.CONFLICT, message: "Cancelled orders cannot be paid" },

  // Uploads
  UPLOAD_FILE_MISSING: { status: StatusCodes.BAD_REQUEST, message: "No file uploaded" }
};
