// Availability engine — bridges persisted salon data and the pure slot core.
//
// Responsibilities:
//   - translate appointment UTC instants into the local-minutes domain,
//   - apply working hours for the requested weekday,
//   - exclude past slots for "today",
//   - expose `availableSlotsForDay` (powers the availability API) and
//     `nextAvailableSlot` (powers the map's "next available" feature).

import {
  computeDaySlots,
  firstDaySlot,
  type BusyInterval,
  type Slot,
} from "./slots";
import { localStartOfDay, localToUtc, toLocalParts } from "./time";
import { BLOCKING_STATUSES } from "../enums";

export interface WorkingHoursRow {
  weekday: number; // 0..6
  openMinute: number;
  closeMinute: number;
  closed: boolean;
}

export interface AppointmentRow {
  staffMemberId: string;
  startTime: Date; // UTC
  endTime: Date; // UTC
  status: string;
}

export interface SalonAvailabilityData {
  workingHours: WorkingHoursRow[];
  staffIds: string[];
  /** Appointments to consider; non-blocking statuses are ignored internally. */
  appointments: AppointmentRow[];
}

export interface AvailableSlot {
  /** Slot start as a UTC instant. */
  startUtc: Date;
  /** Slot end as a UTC instant. */
  endUtc: Date;
  /** "HH:MM" in Europe/Bucharest, convenient for the UI. */
  label: string;
  freeStaffIds: string[];
}

const HORIZON_DAYS_DEFAULT = 10;
const NOON_MS = 12 * 60 * 60 * 1000;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function minuteToLabel(minute: number): string {
  return `${pad2(Math.floor(minute / 60))}:${pad2(minute % 60)}`;
}

/** Build per-staff busy intervals (in local minutes) for a given calendar day. */
function busyForDay(
  appointments: AppointmentRow[],
  dayMidnightUtcMs: number,
): BusyInterval[] {
  const dayEndMs = dayMidnightUtcMs + 24 * 60 * 60 * 1000;
  const out: BusyInterval[] = [];
  for (const appt of appointments) {
    if (!BLOCKING_STATUSES.includes(appt.status as never)) continue;
    const startMs = appt.startTime.getTime();
    const endMs = appt.endTime.getTime();
    // Skip appointments that don't touch this day at all.
    if (endMs <= dayMidnightUtcMs || startMs >= dayEndMs) continue;
    // Clamp to the day and convert to minutes from local midnight.
    const startMinute = Math.max(0, Math.round((startMs - dayMidnightUtcMs) / 60000));
    const endMinute = Math.min(1440, Math.round((endMs - dayMidnightUtcMs) / 60000));
    if (endMinute > startMinute) {
      out.push({ staffMemberId: appt.staffMemberId, startMinute, endMinute });
    }
  }
  return out;
}

function slotsToAvailable(
  slots: Slot[],
  year: number,
  month: number,
  day: number,
): AvailableSlot[] {
  return slots.map((s) => ({
    startUtc: localToUtc(year, month, day, s.startMinute),
    endUtc: localToUtc(year, month, day, s.endMinute),
    label: minuteToLabel(s.startMinute),
    freeStaffIds: s.freeStaffIds,
  }));
}

/**
 * All bookable slots for one salon + service on one Bucharest calendar day.
 * Pass `now` to exclude past slots when the day is today.
 */
export function availableSlotsForDay(
  data: SalonAvailabilityData,
  serviceDurationMinutes: number,
  localDay: { year: number; month: number; day: number },
  now?: Date,
): AvailableSlot[] {
  const { year, month, day } = localDay;
  const midnightUtc = localStartOfDay(year, month, day);
  const midnightMs = midnightUtc.getTime();

  const dow = toLocalParts(midnightUtc).weekday;
  const wh = data.workingHours.find((w) => w.weekday === dow);
  if (!wh || wh.closed) return [];

  // If this calendar day is today (in local time), forbid past slots.
  let notBeforeMinute: number | undefined;
  if (now) {
    const nowParts = toLocalParts(now);
    if (nowParts.year === year && nowParts.month === month && nowParts.day === day) {
      notBeforeMinute = nowParts.minute;
    } else if (
      now.getTime() >= midnightMs + 24 * 60 * 60 * 1000 // day already in the past
    ) {
      return [];
    }
  }

  const slots = computeDaySlots({
    openMinute: wh.openMinute,
    closeMinute: wh.closeMinute,
    closed: wh.closed,
    serviceDurationMinutes,
    staffIds: data.staffIds,
    busy: busyForDay(data.appointments, midnightMs),
    notBeforeMinute,
  });

  return slotsToAvailable(slots, year, month, day);
}

/**
 * The earliest bookable slot at or after `now`, searching forward up to
 * `horizonDays`. Returns null if nothing is available in that window. This is
 * the "next available slot" value shown on the map.
 */
export function nextAvailableSlot(
  data: SalonAvailabilityData,
  serviceDurationMinutes: number,
  now: Date,
  horizonDays = HORIZON_DAYS_DEFAULT,
): AvailableSlot | null {
  const todayMidnight = (() => {
    const p = toLocalParts(now);
    return localStartOfDay(p.year, p.month, p.day).getTime();
  })();

  for (let offset = 0; offset <= horizonDays; offset++) {
    // Sample at local noon of the offset day to stay clear of DST midnight edges.
    const sample = new Date(todayMidnight + offset * 24 * 60 * 60 * 1000 + NOON_MS);
    const p = toLocalParts(sample);
    const midnightUtc = localStartOfDay(p.year, p.month, p.day);
    const dow = toLocalParts(midnightUtc).weekday;
    const wh = data.workingHours.find((w) => w.weekday === dow);
    if (!wh || wh.closed) continue;

    const notBeforeMinute = offset === 0 ? toLocalParts(now).minute : undefined;
    const slot = firstDaySlot({
      openMinute: wh.openMinute,
      closeMinute: wh.closeMinute,
      closed: wh.closed,
      serviceDurationMinutes,
      staffIds: data.staffIds,
      busy: busyForDay(data.appointments, midnightUtc.getTime()),
      notBeforeMinute,
    });
    if (slot) {
      const [available] = slotsToAvailable([slot], p.year, p.month, p.day);
      return available;
    }
  }
  return null;
}
