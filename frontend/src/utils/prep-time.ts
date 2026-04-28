/** Short prep hint from working_hours text or a neutral default. */
export const formatPrepEstimate = (workingHours: string | null | undefined): string => {
  const raw = workingHours?.trim();
  if (!raw) return "حوالي ١٥ د";
  const nums = raw.match(/\d+/g);
  if (!nums?.length) return "حوالي ١٥ د";
  const n = parseInt(nums[0], 10);
  if (!Number.isFinite(n)) return "حوالي ١٥ د";
  const minutes = Math.min(45, Math.max(5, n));
  return `${minutes.toLocaleString("ar-SA")} د`;
};
