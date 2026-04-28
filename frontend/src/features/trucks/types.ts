export type TruckDiscoveryItem = {
  id: number;
  display_name: string;
  slug: string | null;
  description: string | null;
  cover_image_url: string | null;
  working_hours: string | null;
  avg_rating: number | string | null;
  rating_count: number | null;
  operational_status: "open" | "closed" | "paused" | string;
  latitude: number | string;
  longitude: number | string;
  neighborhood: string | null;
  city: string | null;
  category_name: string | null;
  avg_prep_minutes?: number | null;
  estimated_prep_minutes?: number | null;
};

export type TruckMenuItem = {
  id: number;
  name: string;
  description: string | null;
  price: number | string;
  image_url: string | null;
  is_available: number | boolean;
  category_id: number | null;
};

export type TruckDetails = {
  id: number;
  display_name: string;
  slug: string | null;
  description: string | null;
  cover_image_url: string | null;
  avg_rating: number | string | null;
  rating_count: number | null;
  operational_status: "open" | "closed" | "paused" | string;
  latitude: number | string;
  longitude: number | string;
  neighborhood: string | null;
  city: string | null;
  menuItems: TruckMenuItem[];
};

export type DiscoveryFilters = {
  city?: string;
  neighborhood?: string;
  categoryId?: number;
};
