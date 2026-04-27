/**
 * Canonical API response envelopes.
 * Every response coming out of this backend goes through one of these shapes.
 */

export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

export type ApiErrorPayload = {
  code: string;
  details?: unknown;
};

export type ApiFailure = {
  success: false;
  message: string;
  error?: ApiErrorPayload;
};

export const ok = <T>(message: string, data: T): ApiSuccess<T> => ({
  success: true,
  message,
  data
});

export const fail = (message: string, error?: ApiErrorPayload): ApiFailure => ({
  success: false,
  message,
  error
});
