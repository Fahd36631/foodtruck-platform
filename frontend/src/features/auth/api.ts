import axios from "axios";

import { apiClient } from "@/api/client";
import type { ApiEnvelope } from "@/api/envelope";

type LoginResponse = {
  accessToken: string;
  user: {
    id: number;
    fullName: string;
    email: string;
    phone: string;
    roleCode: string;
  };
};

type RegisterPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  roleCode: "customer" | "truck_owner";
};

export const login = async (email: string, password: string) => {
  const response = await apiClient.post<ApiEnvelope<LoginResponse>>("/auth/login", {
    email,
    password
  });

  return response.data.data;
};

type RegisterResponse = {
  userId: number;
  message: string;
  requiresVerification: boolean;
};

type VerifyEmailResponse = {
  email: string;
  isEmailVerified: boolean;
};

type ResendCodeResponse = {
  email: string;
};

export const register = async (payload: RegisterPayload): Promise<RegisterResponse> => {
  const response = await apiClient.post<ApiEnvelope<{ userId: number }>>("/auth/register", payload);
  const message = response.data.message ?? "";
  const requiresVerification =
    message.toLowerCase().includes("verify") ||
    message.includes("تحقق") ||
    Boolean((response.data.data as { requiresVerification?: boolean }).requiresVerification);

  return {
    userId: response.data.data.userId,
    message,
    requiresVerification: requiresVerification || true
  };
};

export const verifyEmail = async (email: string, code: string) => {
  const response = await apiClient.post<ApiEnvelope<VerifyEmailResponse>>("/auth/verify-email", {
    email: email.trim().toLowerCase(),
    code: code.trim()
  });

  return response.data.data;
};

export const resendVerificationCode = async (email: string) => {
  const response = await apiClient.post<ApiEnvelope<ResendCodeResponse>>("/auth/resend-code", {
    email: email.trim().toLowerCase()
  });

  return response.data;
};

export const isEmailVerificationRequired = (error: unknown): boolean => {
  if (!axios.isAxiosError(error) || error.response?.status !== 403) {
    return false;
  }

  const payload = error.response.data as { message?: string; error?: { code?: string } } | undefined;
  return (
    payload?.message === "Please verify your email first" ||
    payload?.error?.code === "AUTH_EMAIL_NOT_VERIFIED"
  );
};

export const getVerificationErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error) || !error.response) {
    return "حدث خطأ غير متوقع. حاول مرة أخرى.";
  }

  const payload = error.response.data as { message?: string; error?: { code?: string } } | undefined;
  const code = payload?.error?.code;

  if (code === "AUTH_VERIFICATION_CODE_EXPIRED") {
    return "انتهت صلاحية رمز التحقق. اطلب رمزًا جديدًا.";
  }
  if (code === "AUTH_VERIFICATION_CODE_INVALID") {
    return "رمز التحقق غير صحيح.";
  }
  if (code === "AUTH_VERIFICATION_TOO_MANY_ATTEMPTS") {
    return "محاولات كثيرة غير صحيحة. اطلب رمزًا جديدًا.";
  }
  if (code === "AUTH_EMAIL_ALREADY_VERIFIED") {
    return "البريد الإلكتروني مُفعّل مسبقًا. يمكنك تسجيل الدخول.";
  }
  if (code === "AUTH_EMAIL_SEND_FAILED") {
    return "تعذّر إرسال الرمز. حاول مرة أخرى لاحقًا.";
  }

  if (payload?.message) {
    return payload.message;
  }

  return `فشل الطلب برمز الحالة ${error.response.status}.`;
};

export type ProfileResponse = {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  roleCode: string;
};

export const getMyProfile = async (accessToken: string) => {
  const response = await apiClient.get<ApiEnvelope<ProfileResponse>>("/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data.data;
};

export const updateMyProfile = async (
  payload: { fullName: string; email: string; phone: string },
  accessToken: string
) => {
  const response = await apiClient.patch<ApiEnvelope<ProfileResponse>>("/auth/me", payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data.data;
};

export const changeMyPassword = async (
  payload: { currentPassword: string; newPassword: string },
  accessToken: string
) => {
  await apiClient.patch("/auth/me/password", payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
};
