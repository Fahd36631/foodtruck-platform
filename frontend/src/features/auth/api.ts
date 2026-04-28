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

export const register = async (payload: RegisterPayload) => {
  const response = await apiClient.post<ApiEnvelope<{ userId: number }>>("/auth/register", payload);
  return response.data.data;
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
