import { describe, it, expect } from "vitest";
import {
  availableSlotsForDay,
  nextAvailableSlot,
  type SalonAvailabilityData,
  type AppointmentRow,
} from "./engine";
import { toLocalParts, localToUtc } from "./time";

// Open 09:00–20:00 every weekday so tests don't depend on which day we pick.
const ALL_DAYS_OPEN = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  openMinute: 540,
  closeMinute: 1200,
  closed: false,
}));

function data(
  appointments: AppointmentRow[] = [],
  staffIds: string[] = ["s1"],
): SalonAvailabilityData {
  return { workingHours: ALL_DAYS_OPEN, staffIds, appointments };
}

// A fixed winter day (Europe/Bucharest is UTC+2 then): 2026-01-19.
const DAY = { year: 2026, month: 1, day: 19 };
// local 08:00 that morning, before opening.
const MORNING = localToUtc(DAY.year, DAY.month, DAY.day, 8 * 60);

describe("availableSlotsForDay — timezone correctness", () => {
  it("first slot is at 09:00 local and maps to the correct UTC instant", () => {
    const slots = availableSlotsForDay(data(), 60, DAY, MORNING);
    expect(slots[0].label).toBe("09:00");
    // 09:00 Bucharest winter = 07:00 UTC
    expect(slots[0].startUtc.toISOString()).toBe("2026-01-19T07:00:00.000Z");
    // round-trips back to local 09:00
    expect(toLocalParts(slots[0].startUtc).minute).toBe(540);
  });

  it("excludes slots in the past for today", () => {
    // 'now' = local 13:10 → first slot should be 13:15.
    const now = localToUtc(DAY.year, DAY.month, DAY.day, 13 * 60 + 10);
    const slots = availableSlotsForDay(data(), 60, DAY, now);
    expect(slots[0].label).toBe("13:15");
  });
});

describe("availableSlotsForDay — cancelled appointments free the slot", () => {
  // One staff member, an appointment covering local 12:00–13:00.
  const apptStart = localToUtc(DAY.year, DAY.month, DAY.day, 12 * 60);
  const apptEnd = localToUtc(DAY.year, DAY.month, DAY.day, 13 * 60);

  const noonSlotExists = (slots: { label: string }[]) =>
    slots.some((s) => s.label === "12:00");

  it("blocks the noon slot when the appointment is CONFIRMED", () => {
    const slots = availableSlotsForDay(
      data([{ staffMemberId: "s1", startTime: apptStart, endTime: apptEnd, status: "CONFIRMED" }]),
      60,
      DAY,
      MORNING,
    );
    expect(noonSlotExists(slots)).toBe(false);
  });

  it("frees the noon slot when that same appointment is CANCELLED", () => {
    const slots = availableSlotsForDay(
      data([{ staffMemberId: "s1", startTime: apptStart, endTime: apptEnd, status: "CANCELLED" }]),
      60,
      DAY,
      MORNING,
    );
    expect(noonSlotExists(slots)).toBe(true);
  });

  it("also treats PENDING and COMPLETED as blocking", () => {
    for (const status of ["PENDING", "COMPLETED"] as const) {
      const slots = availableSlotsForDay(
        data([{ staffMemberId: "s1", startTime: apptStart, endTime: apptEnd, status }]),
        60,
        DAY,
        MORNING,
      );
      expect(noonSlotExists(slots)).toBe(false);
    }
  });
});

describe("nextAvailableSlot", () => {
  it("returns today's first open slot when free", () => {
    const slot = nextAvailableSlot(data(), 60, MORNING);
    expect(slot).not.toBeNull();
    expect(slot?.label).toBe("09:00");
    expect(toLocalParts(slot!.startUtc)).toMatchObject({ year: 2026, month: 1, day: 19 });
  });

  it("rolls over to the next day when today is fully booked", () => {
    // Block the only staff member for the entire working day today.
    const dayStart = localToUtc(DAY.year, DAY.month, DAY.day, 540);
    const dayEnd = localToUtc(DAY.year, DAY.month, DAY.day, 1200);
    const slot = nextAvailableSlot(
      data([{ staffMemberId: "s1", startTime: dayStart, endTime: dayEnd, status: "CONFIRMED" }]),
      60,
      MORNING,
    );
    expect(slot).not.toBeNull();
    // First slot of the following day, 09:00.
    expect(slot?.label).toBe("09:00");
    expect(toLocalParts(slot!.startUtc).day).toBe(20);
  });

  it("returns null when nothing is available within the horizon", () => {
    const closed: SalonAvailabilityData = {
      workingHours: ALL_DAYS_OPEN.map((w) => ({ ...w, closed: true })),
      staffIds: ["s1"],
      appointments: [],
    };
    expect(nextAvailableSlot(closed, 60, MORNING)).toBeNull();
  });
});
