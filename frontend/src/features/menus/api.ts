import { apiClient } from "@/api/client";
import type { ApiEnvelope } from "@/api/envelope";

export type MenuCategory = {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
};

export type OwnerMenuItem = {
  id: number;
  truck_id: number;
  category_id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
};

export const getMenuCategories = async (accessToken: string) => {
  const response = await apiClient.get<ApiEnvelope<{ items: MenuCategory[] }>>("/menus/categories", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data.data.items;
};

export const getOwnerMenuItems = async (truckId: number, accessToken: string) => {
  const response = await apiClient.get<ApiEnvelope<{ items: OwnerMenuItem[] }>>("/menus", {
    params: { truckId },
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data.data.items;
};

export const createOwnerMenuItem = async (
  payload: {
    truckId: number;
    categoryId: number;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    isAvailable: boolean;
  },
  accessToken: string
) => {
  await apiClient.post("/menus", payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
};

export const updateOwnerMenuItem = async (
  menuItemId: number,
  payload: {
    categoryId?: number;
    name?: string;
    description?: string;
    price?: number;
    imageUrl?: string;
    isAvailable?: boolean;
  },
  accessToken: string
) => {
  await apiClient.patch(`/menus/${menuItemId}`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
};

export const deleteOwnerMenuItem = async (menuItemId: number, accessToken: string) => {
  await apiClient.delete(`/menus/${menuItemId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
};
