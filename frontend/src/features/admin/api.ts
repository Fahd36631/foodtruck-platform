import { apiClient } from "@/api/client";
import type { ApiEnvelope } from "@/api/envelope";

export type PendingTruck = {
  id: number;
  display_name: string;
  description: string | null;
  cover_image_url: string | null;
  working_hours: string | null;
  contact_phone: string | null;
  category_name: string | null;
  approval_status: string;
  created_at: string;
  owner_full_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  city: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  license_number: string;
  document_url: string | null;
  expires_at: string | null;
  review_status: string;
};

export type AdminStats = {
  pendingRequests: number;
  approvedTrucks: number;
  rejectedTrucks: number;
  todayRequests: number;
};

export const getPendingTrucks = async (accessToken: string) => {
  const response = await apiClient.get<ApiEnvelope<{ items: PendingTruck[] }>>("/trucks/admin/pending", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data.data.items;
};

export const getAdminStats = async (accessToken: string) => {
  const response = await apiClient.get<ApiEnvelope<AdminStats>>("/admin/stats", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data.data;
};

export const reviewTruck = async (
  truckId: number,
  decision: "approved" | "rejected",
  accessToken: string,
  reviewNote?: string
) => {
  await apiClient.patch(
    `/trucks/${truckId}/admin/review`,
    { decision, reviewNote },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
};

export const createAdminAccount = async (
  payload: { fullName: string; email: string; phone: string; password: string },
  accessToken: string
) => {
  await apiClient.post("/auth/admin/register", payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
};
