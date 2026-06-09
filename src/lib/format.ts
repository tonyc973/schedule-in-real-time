// Romanian (ro-RO, Europe/Bucharest) display helpers. Client-safe — no server deps.

const TZ = "Europe/Bucharest";

const WEEKDAYS_RO = [
  "duminică",
  "luni",
  "marți",
  "miercuri",
  "joi",
  "vineri",
  "sâmbătă",
];

const timeFmt = new Intl.DateTimeFormat("ro-RO", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dateFmt = new Intl.DateTimeFormat("ro-RO", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function formatPrice(ron: number): string {
  return `${ron} RON`;
}

export function priceLevelSymbol(level: number): string {
  return "$".repeat(Math.max(1, Math.min(3, level)));
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

export function formatLongDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

/** Human "next available" label, e.g. "azi la 14:30", "mâine la 09:00", "vineri la 11:15". */
export function formatNextSlot(iso: string, now: Date = new Date()): string {
  const target = new Date(iso);
  const diffMin = Math.round((target.getTime() - now.getTime()) / 60000);
  if (diffMin <= 0) return "disponibil acum";
  if (diffMin < 60) return `în ${diffMin} min`;

  const targetKey = dayKeyFmt.format(target);
  const todayKey = dayKeyFmt.format(now);
  const tomorrowKey = dayKeyFmt.format(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const time = timeFmt.format(target);

  if (targetKey === todayKey) return `azi la ${time}`;
  if (targetKey === tomorrowKey) return `mâine la ${time}`;

  const weekday = WEEKDAYS_RO[target.getDay()];
  return `${weekday} la ${time}`;
}

/** Today's date as YYYY-MM-DD in Bucharest local time (for the availability API). */
export function todayLocalDateString(now: Date = new Date()): string {
  return dayKeyFmt.format(now); // en-CA gives YYYY-MM-DD
}

export function localDateString(date: Date): string {
  return dayKeyFmt.format(date);
}
