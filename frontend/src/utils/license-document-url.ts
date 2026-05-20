/**
 * Admin license panel helpers (delivery URL logic lives in API + admin screen).
 */
export function formatLicenseExpiryForAdmin(iso: string | null | undefined): string {
  if (!iso?.trim()) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
}
