export const ROLE_CODES = {
  ADMIN: "admin",
  TRUCK_OWNER: "truck_owner",
  CUSTOMER: "customer"
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];
