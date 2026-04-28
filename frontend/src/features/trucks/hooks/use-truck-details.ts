import { useQuery } from "@tanstack/react-query";

import { getTruckDetails } from "../api";

export const useTruckDetails = (truckId: number, accessToken?: string) => {
  return useQuery({
    queryKey: ["truck-details", truckId],
    queryFn: () => getTruckDetails(truckId, accessToken),
    enabled: Boolean(truckId),
    staleTime: 0,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: "always",
    refetchOnReconnect: true
  });
};
