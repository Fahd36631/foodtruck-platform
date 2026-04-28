const toRad = (deg: number) => (deg * Math.PI) / 180;

export const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  if (![lat1, lon1, lat2, lon2].every((n) => Number.isFinite(n))) return Number.POSITIVE_INFINITY;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/** e.g. 1.7999 -> "1.8 كم" */
export const formatDistanceKm = (km: number | null | undefined): string | null => {
  if (km === null || km === undefined || !Number.isFinite(km)) return null;
  if (km < 0.05) return "بالقرب منك";
  if (km < 1) return `${Math.round(km * 1000)} م`;
  return `${(Math.round(km * 10) / 10).toLocaleString("ar-SA")} كم`;
};
