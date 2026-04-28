import { useQuery } from "@tanstack/react-query";

import { getDiscoveryTrucks } from "../api";
import type { DiscoveryFilters } from "../types";
import { dedupeTrucksById } from "../utils";

export const useTrucksDiscovery = (filters: DiscoveryFilters, accessToken?: string) => {
  return useQuery({
    queryKey: ["trucks-discovery", filters],
    queryFn: () => getDiscoveryTrucks(filters, accessToken),
    enabled: true,
    select: (items) => dedupeTrucksById(items)
  });
};
