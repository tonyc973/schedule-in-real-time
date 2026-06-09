// Pure availability core — the heart of the app.
//
// Everything here works in the "minutes from local midnight" domain so it is
// fully deterministic and unit-testable without a database or timezone. The
// timezone boundary (UTC <-> Europe/Bucharest wall clock) lives in time.ts and
// is applied by the engine before/after calling into these functions.

export const SLOT_GRANULARITY_MINUTES = 15;

/** A span of time during which a particular staff member is occupied. */
export interface BusyInterval {
  staffMemberId: string;
  startMinute: number; // inclusive, minutes from local midnight
  endMinute: number; // exclusive
}

export interface DaySlotParams {
  /** Salon opening time, minutes from local midnight (e.g. 540 = 09:00). */
  openMinute: number;
  /** Salon closing time, minutes from local midnight (e.g. 1200 = 20:00). */
  closeMinute: number;
  /** Whether the salon is closed that weekday. */
  closed: boolean;
  /** Duration of the chosen service. */
  serviceDurationMinutes: number;
  /** IDs of staff members who can perform the service. */
  staffIds: string[];
  /** Non-cancelled appointments occupying staff on this day. */
  busy: BusyInterval[];
  /** Slot step; defaults to 15 minutes. */
  slotGranularityMinutes?: number;
  /** Optional lower bound — exclude slots starting before this minute (used for "today"). */
  notBeforeMinute?: number;
}

export interface Slot {
  startMinute: number;
  endMinute: number;
  /** Staff members free for the whole [start, end) span — never empty. */
  freeStaffIds: string[];
}

/** Smallest multiple of `step` that is >= `value`. */
function ceilTo(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

/** Do two half-open intervals [aStart,aEnd) and [bStart,bEnd) overlap? */
export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Compute every bookable start slot for one salon, one service, one day.
 *
 * A slot at minute `s` is bookable when:
 *   - it is aligned to the granularity,
 *   - the full service duration fits inside opening hours: s >= open and
 *     s + duration <= close,
 *   - it is not before `notBeforeMinute` (if given), and
 *   - at least one staff member has no blocking appointment overlapping
 *     [s, s + duration).
 */
export function computeDaySlots(params: DaySlotParams): Slot[] {
  const {
    openMinute,
    closeMinute,
    closed,
    serviceDurationMinutes,
    staffIds,
    busy,
    slotGranularityMinutes = SLOT_GRANULARITY_MINUTES,
    notBeforeMinute,
  } = params;

  if (closed) return [];
  if (serviceDurationMinutes <= 0) return [];
  if (staffIds.length === 0) return [];
  if (closeMinute - openMinute < serviceDurationMinutes) return [];

  const gran = slotGranularityMinutes;
  const lowerBound =
    notBeforeMinute === undefined
      ? openMinute
      : Math.max(openMinute, notBeforeMinute);

  // Group busy intervals by staff for quick lookup.
  const busyByStaff = new Map<string, BusyInterval[]>();
  for (const interval of busy) {
    const list = busyByStaff.get(interval.staffMemberId);
    if (list) list.push(interval);
    else busyByStaff.set(interval.staffMemberId, [interval]);
  }

  const slots: Slot[] = [];
  const firstStart = ceilTo(lowerBound, gran);

  for (let start = firstStart; start + serviceDurationMinutes <= closeMinute; start += gran) {
    const end = start + serviceDurationMinutes;
    const freeStaffIds = staffIds.filter((staffId) => {
      const intervals = busyByStaff.get(staffId);
      if (!intervals) return true;
      return !intervals.some((b) => intervalsOverlap(start, end, b.startMinute, b.endMinute));
    });
    if (freeStaffIds.length > 0) {
      slots.push({ startMinute: start, endMinute: end, freeStaffIds });
    }
  }

  return slots;
}

/** First bookable slot of the day, or null if none. */
export function firstDaySlot(params: DaySlotParams): Slot | null {
  // Small optimisation over computeDaySlots: stop at the first hit.
  const {
    openMinute,
    closeMinute,
    closed,
    serviceDurationMinutes,
    staffIds,
    busy,
    slotGranularityMinutes = SLOT_GRANULARITY_MINUTES,
    notBeforeMinute,
  } = params;

  if (closed || serviceDurationMinutes <= 0 || staffIds.length === 0) return null;

  const gran = slotGranularityMinutes;
  const lowerBound =
    notBeforeMinute === undefined ? openMinute : Math.max(openMinute, notBeforeMinute);

  for (
    let start = ceilTo(lowerBound, gran);
    start + serviceDurationMinutes <= closeMinute;
    start += gran
  ) {
    const end = start + serviceDurationMinutes;
    const freeStaffIds = staffIds.filter((staffId) => {
      return !busy.some(
        (b) =>
          b.staffMemberId === staffId &&
          intervalsOverlap(start, end, b.startMinute, b.endMinute),
      );
    });
    if (freeStaffIds.length > 0) {
      return { startMinute: start, endMinute: end, freeStaffIds };
    }
  }
  return null;
}
