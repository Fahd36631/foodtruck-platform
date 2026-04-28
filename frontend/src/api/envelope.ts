/**
 * Standard API response envelope used by every backend endpoint.
 * Centralized here so feature API files don't redeclare it.
 */
export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};
