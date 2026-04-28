import { apiClient } from "@/api/client";
import type { ApiEnvelope } from "@/api/envelope";

import type { DiscoveryFilters, TruckDetails, TruckDiscoveryItem } from "./types";

const authHeaders = (accessToken?: string) =>
  accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

export const getDiscoveryTrucks = async (filters: DiscoveryFilters, accessToken?: string) => {
  const response = await apiClient.get<ApiEnvelope<{ items: TruckDiscoveryItem[] }>>("/trucks/discovery", {
    params: {
      city: filters.city,
      neighborhood: filters.neighborhood,
      categoryId: filters.categoryId
    },
    headers: authHeaders(accessToken)
  });
  return response.data.data.items;
};

export const getTruckDetails = async (truckId: number, accessToken?: string): Promise<TruckDetails> => {
  const response = await apiClient.get<ApiEnvelope<TruckDetails>>(`/trucks/${truckId}/details`, {
    headers: authHeaders(accessToken)
  });
  return response.data.data;
};

export type OwnerTruckSummary = {
  id: number;
  display_name: string;
  approval_status: "pending" | "approved" | "rejected";
  operational_status: "open" | "closed" | "paused";
  created_at: string;
  review_note: string | null;
  reviewed_at: string | null;
};

export const getMyOwnerTrucks = async (accessToken: string) => {
  const response = await apiClient.get<ApiEnvelope<{ items: OwnerTruckSummary[] }>>("/trucks/mine", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data.data.items;
};

export type OwnerTruckDraft = {
  id: number;
  display_name: string;
  description: string | null;
  cover_image_url: string | null;
  working_hours: string | null;
  contact_phone: string | null;
  approval_status: string;
  city: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  license_number: string | null;
  document_url: string | null;
  expires_at: string | null;
  category_name: string | null;
  captured_at?: string | null;
};

export const getMyOwnerTruckDraft = async (accessToken: string) => {
  const response = await apiClient.get<ApiEnvelope<OwnerTruckDraft | null>>("/trucks/mine/draft", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data.data;
};

export type OwnerNotificationItem = {
  id: number;
  title: string;
  body: string;
  type: "order_update" | "system" | "admin_action";
  is_read: boolean;
  metadata_json: string | null;
  created_at: string;
};

export const getMyOwnerNotifications = async (accessToken: string) => {
  const response = await apiClient.get<ApiEnvelope<{ items: OwnerNotificationItem[] }>>("/trucks/mine/notifications", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data.data.items;
};

export type RegisterTruckPayload = {
  displayName: string;
  categoryName: string;
  description?: string;
  workingHours: string;
  contactPhone: string;
  coverImageUrl?: string | null;
  location: {
    city: string;
    neighborhood: string;
    latitude: number;
    longitude: number;
  };
  license: {
    licenseNumber: string;
    documentUrl: string;
    expiresAt: string;
  };
};

export const registerTruck = async (payload: RegisterTruckPayload, accessToken: string) => {
  const response = await apiClient.post<ApiEnvelope<{ truckId: number }>>("/trucks", payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data.data;
};

export const updateOwnerTruckProfile = async (
  truckId: number,
  payload: {
    displayName?: string;
    categoryName?: string;
    description?: string;
    workingHours?: string;
    contactPhone?: string;
    coverImageUrl?: string | null;
  },
  accessToken: string
) => {
  await apiClient.patch(`/trucks/${truckId}/profile`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
};

export const updateOwnerTruckLocation = async (
  truckId: number,
  payload: { city: string; neighborhood: string; latitude: number; longitude: number },
  accessToken: string
) => {
  await apiClient.patch(`/trucks/${truckId}/location`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
};

export const updateOwnerTruckStatus = async (
  truckId: number,
  status: "open" | "closed" | "paused",
  accessToken: string
) => {
  await apiClient.patch(
    `/trucks/${truckId}/status`,
    { status },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
};

type UploadResult = { url: string; fileName?: string };

export const uploadSingleFile = async (
  file: { uri: string; fileName?: string; mimeType?: string },
  accessToken: string
): Promise<UploadResult> => {
  const formData = new FormData();
  const inferredName = file.fileName || file.uri.split("/").pop() || "upload";
  const inferredType = file.mimeType || "application/octet-stream";

  formData.append("file", {
    uri: file.uri,
    name: inferredName,
    type: inferredType
  } as unknown as Blob);

  const response = await apiClient.post<ApiEnvelope<UploadResult>>("/uploads/single", formData, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "multipart/form-data"
    }
  });

  return response.data.data;
};
