const TIME_12H = /(\d{1,2}):(\d{2})\s*(ص|م|AM|PM)/i;

const to24Hour = (hour12: number, minute: number, period: string): { h: number; m: number } => {
  const isPm = period === "م" || period.toUpperCase() === "PM";
  let h = hour12 % 12;
  if (isPm) h += 12;
  return { h, m: minute };
};

const from24Hour = (h: number, m: number): { hour12: number; minute: number; period: "ص" | "م" } => {
  const period: "ص" | "م" = h >= 12 ? "م" : "ص";
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute: m, period };
};

export const formatWorkingHoursRange = (start: Date, end: Date): string => {
  const s = from24Hour(start.getHours(), start.getMinutes());
  const e = from24Hour(end.getHours(), end.getMinutes());
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return `من ${s.hour12}:${pad(s.minute)} ${s.period} إلى ${e.hour12}:${pad(e.minute)} ${e.period}`;
};

export const parseWorkingHoursRange = (raw: string | null | undefined): { start: Date; end: Date } | null => {
  const text = raw?.trim();
  if (!text) return null;

  const rangeMatch = text.match(/من\s+(.+?)\s+إلى\s+(.+)/);
  if (rangeMatch) {
    const startPart = parseTimeToken(rangeMatch[1]);
    const endPart = parseTimeToken(rangeMatch[2]);
    if (startPart && endPart) {
      return { start: startPart, end: endPart };
    }
  }

  const times = [...text.matchAll(/(\d{1,2}):(\d{2})\s*(ص|م|AM|PM)?/gi)];
  if (times.length >= 2) {
    const startPart = parseTimeToken(times[0][0]);
    const endPart = parseTimeToken(times[1][0]);
    if (startPart && endPart) {
      return { start: startPart, end: endPart };
    }
  }

  return null;
};

const parseTimeToken = (token: string): Date | null => {
  const match = token.trim().match(TIME_12H);
  if (!match) {
    const plain = token.trim().match(/(\d{1,2}):(\d{2})/);
    if (!plain) return null;
    const d = new Date();
    d.setHours(Number(plain[1]), Number(plain[2]), 0, 0);
    return d;
  }

  const hour12 = Number(match[1]);
  const minute = Number(match[2]);
  const { h, m } = to24Hour(hour12, minute, match[3]);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

export const defaultWorkStart = (): Date => {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
};

export const defaultWorkEnd = (): Date => {
  const d = new Date();
  d.setHours(23, 0, 0, 0);
  return d;
};

const pad2 = (n: number) => `${n}`.padStart(2, "0");

export type TimeParts = { hour12: number; minute: number; period: "ص" | "م" };

export const snapMinuteToFive = (minute: number): number => {
  const snapped = Math.round(minute / 5) * 5;
  return snapped >= 60 ? 55 : snapped;
};

export const getTimeParts = (date: Date): TimeParts => {
  const parts = from24Hour(date.getHours(), date.getMinutes());
  return { ...parts, minute: snapMinuteToFive(parts.minute) };
};

export const buildTimeDate = ({ hour12, minute, period }: TimeParts): Date => {
  const { h, m } = to24Hour(hour12, minute, period);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

export const formatTimeLabel = (date: Date): string => {
  const { hour12, minute, period } = getTimeParts(date);
  return `${hour12}:${pad2(minute)} ${period}`;
};

export const formatTimeLabelPadded = (date: Date): string => {
  const { hour12, minute, period } = getTimeParts(date);
  return `${pad2(hour12)}:${pad2(minute)} ${period}`;
};

export const formatWorkingHoursDisplay = (start: Date, end: Date): string =>
  `${formatTimeLabelPadded(start)} - ${formatTimeLabelPadded(end)}`;

export const isValidWorkRange = (start: Date, end: Date): boolean => {
  const startMins = start.getHours() * 60 + start.getMinutes();
  const endMins = end.getHours() * 60 + end.getMinutes();
  return endMins > startMins;
};
