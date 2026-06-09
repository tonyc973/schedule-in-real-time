// Timezone boundary helpers.
//
// All timestamps are stored in UTC. Salons keep their working hours as
// minutes-from-midnight in their *local* wall clock, which for this app is
// always Europe/Bucharest (EET/EEST, UTC+2/+3 with DST). These helpers translate
// between a UTC instant and Bucharest wall-clock parts so the pure slot core can
// work in the local-minutes domain.

export const SALON_TIME_ZONE = "Europe/Bucharest";

export interface LocalParts {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
  weekday: number; // 0=Sunday .. 6=Saturday (JS getDay convention)
  minute: number; // minutes from local midnight
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SALON_TIME_ZONE,
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** Break a UTC instant into Europe/Bucharest wall-clock parts. */
export function toLocalParts(utc: Date): LocalParts {
  const parts = partsFormatter.formatToParts(utc);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0; // some engines emit 24 for midnight
  const minute = hour * 60 + Number(get("minute"));
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
    minute,
  };
}

/**
 * Offset in minutes such that localWallClock = utcInstant + offset.
 * (Europe/Bucharest is +120 in winter, +180 in summer.)
 */
function offsetMinutesAt(utc: Date): number {
  const p = partsFormatter.formatToParts(utc);
  const get = (type: string) => Number(p.find((x) => x.type === type)?.value ?? 0);
  let hour = get("hour");
  if (hour === 24) hour = 0;
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"));
  return Math.round((asUTC - utc.getTime()) / 60000);
}

/**
 * Convert a Bucharest wall-clock day + minute-from-midnight into a UTC Date.
 *
 * Uses a two-pass offset refinement so it is correct across DST boundaries
 * (the offset is re-evaluated at the candidate instant). Salons are shut
 * overnight, so the rare DST-transition ambiguity never affects real slots.
 */
export function localToUtc(
  year: number,
  month: number, // 1..12
  day: number,
  minute: number,
): Date {
  const naive = Date.UTC(year, month - 1, day, 0, 0, 0) + minute * 60_000;
  // First guess: assume the naive value is local, find the offset there.
  const firstOffset = offsetMinutesAt(new Date(naive));
  let utc = naive - firstOffset * 60_000;
  // Refine once in case the first guess fell on the wrong side of a DST change.
  const secondOffset = offsetMinutesAt(new Date(utc));
  if (secondOffset !== firstOffset) {
    utc = naive - secondOffset * 60_000;
  }
  return new Date(utc);
}

/** Midnight (00:00 local) of the given Bucharest calendar day, as a UTC Date. */
export function localStartOfDay(year: number, month: number, day: number): Date {
  return localToUtc(year, month, day, 0);
}

/**
 * Parse a `YYYY-MM-DD` string into its numeric parts. Returns null if malformed.
 */
export function parseDateOnly(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}
