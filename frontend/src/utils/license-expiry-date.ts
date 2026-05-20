export type DateParts = { year: number; month: number; day: number };

const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر"
] as const;

export const getDateParts = (date: Date): DateParts => ({
  year: date.getFullYear(),
  month: date.getMonth() + 1,
  day: date.getDate()
});

export const buildDateFromParts = ({ year, month, day }: DateParts): Date => new Date(year, month - 1, day, 12, 0, 0, 0);

export const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const daysInMonth = (year: number, month: number): number => new Date(year, month, 0).getDate();

export const clampDayToMonth = (parts: DateParts): DateParts => {
  const maxDay = daysInMonth(parts.year, parts.month);
  return parts.day > maxDay ? { ...parts, day: maxDay } : parts;
};

export const formatLicenseExpiryApi = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const formatLicenseExpiryLabel = (date: Date): string =>
  date.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });

export const formatLicenseExpiryPreview = (parts: DateParts): string =>
  formatLicenseExpiryLabel(buildDateFromParts(parts));

export const getArabicMonthName = (month: number): string => AR_MONTHS[month - 1] ?? `${month}`;

export const buildYearOptions = (fromYear: number, count = 16): number[] =>
  Array.from({ length: count }, (_, i) => fromYear + i);
