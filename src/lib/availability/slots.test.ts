import { describe, it, expect } from "vitest";
import {
  computeDaySlots,
  firstDaySlot,
  intervalsOverlap,
  type BusyInterval,
} from "./slots";
import {
  availableSlotsForDay,
  nextAvailableSlot,
  type SalonAvailabilityData,
} from "./engine";

// 09:00 = 540, 20:00 = 1200
const OPEN = 540;
const CLOSE = 1200;

function baseParams(overrides: Partial<Parameters<typeof computeDaySlots>[0]> = {}) {
  return {
    openMinute: OPEN,
    closeMinute: CLOSE,
    closed: false,
    serviceDurationMinutes: 60,
    staffIds: ["s1"],
    busy: [] as BusyInterval[],
    ...overrides,
  };
}

describe("intervalsOverlap", () => {
  it("treats intervals as half-open: touching ends do not overlap", () => {
    expect(intervalsOverlap(540, 600, 600, 660)).toBe(false); // back-to-back
    expect(intervalsOverlap(540, 600, 599, 660)).toBe(true); // 1-min overlap
    expect(intervalsOverlap(600, 660, 540, 600)).toBe(false);
  });
});

describe("computeDaySlots — basic grid", () => {
  it("produces 15-minute aligned slots within working hours", () => {
    const slots = computeDaySlots(baseParams({ serviceDurationMinutes: 60 }));
    expect(slots[0].startMinute).toBe(540); // 09:00
    // 15-minute granularity
    expect(slots[1].startMinute).toBe(555); // 09:15
    // each consecutive start differs by 15
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].startMinute - slots[i - 1].startMinute).toBe(15);
    }
  });

  it("returns nothing when the salon is closed that day", () => {
    expect(computeDaySlots(baseParams({ closed: true }))).toEqual([]);
  });

  it("returns nothing when there are no staff", () => {
    expect(computeDaySlots(baseParams({ staffIds: [] }))).toEqual([]);
  });
});

describe("computeDaySlots — edge of closing time", () => {
  it("includes the slot that exactly fits before closing", () => {
    // close 1200, 60-min service => last valid start is 1140 (19:00 -> 20:00)
    const slots = computeDaySlots(baseParams({ serviceDurationMinutes: 60 }));
    const last = slots[slots.length - 1];
    expect(last.startMinute).toBe(1140);
    expect(last.endMinute).toBe(1200);
  });

  it("excludes a slot whose service would run past closing", () => {
    // 90-min service: a 19:00 start would end 20:30 > close, so excluded.
    const slots = computeDaySlots(baseParams({ serviceDurationMinutes: 90 }));
    const last = slots[slots.length - 1];
    expect(last.startMinute).toBe(1110); // 18:30 -> 20:00
    expect(slots.some((s) => s.endMinute > CLOSE)).toBe(false);
  });

  it("returns nothing when the service is longer than the whole day window", () => {
    const slots = computeDaySlots(
      baseParams({ openMinute: 600, closeMinute: 660, serviceDurationMinutes: 120 }),
    );
    expect(slots).toEqual([]);
  });
});

describe("computeDaySlots — overlapping bookings", () => {
  it("removes slots that overlap an existing booking when only one staff exists", () => {
    // s1 busy 10:00-11:00 (600-660). A 60-min service can't start 09:15..10:45.
    const slots = computeDaySlots(
      baseParams({
        serviceDurationMinutes: 60,
        busy: [{ staffMemberId: "s1", startMinute: 600, endMinute: 660 }],
      }),
    );
    const starts = slots.map((s) => s.startMinute);
    // 09:00 (540-600) is fine — ends exactly at the booking start.
    expect(starts).toContain(540);
    // anything overlapping 600-660 is gone: 09:15(555-615)..10:00(600-660)..10:45(645-705)
    expect(starts).not.toContain(555);
    expect(starts).not.toContain(600);
    expect(starts).not.toContain(645);
    // 11:00 (660-720) is free again — touches the end, no overlap.
    expect(starts).toContain(660);
  });

  it("keeps a slot bookable while at least one staff member is free", () => {
    // Two staff; s1 busy 10:00-11:00. Slot 10:00 still bookable via s2.
    const slots = computeDaySlots(
      baseParams({
        staffIds: ["s1", "s2"],
        serviceDurationMinutes: 60,
        busy: [{ staffMemberId: "s1", startMinute: 600, endMinute: 660 }],
      }),
    );
    const tenAm = slots.find((s) => s.startMinute === 600);
    expect(tenAm).toBeDefined();
    expect(tenAm?.freeStaffIds).toEqual(["s2"]);
    expect(tenAm?.freeStaffIds).not.toContain("s1");
  });

  it("removes a slot only when every staff member is busy", () => {
    const slots = computeDaySlots(
      baseParams({
        staffIds: ["s1", "s2"],
        serviceDurationMinutes: 60,
        busy: [
          { staffMemberId: "s1", startMinute: 600, endMinute: 660 },
          { staffMemberId: "s2", startMinute: 600, endMinute: 660 },
        ],
      }),
    );
    expect(slots.some((s) => s.startMinute === 600)).toBe(false);
  });
});

describe("firstDaySlot", () => {
  it("matches the first element of computeDaySlots", () => {
    const params = baseParams({
      serviceDurationMinutes: 45,
      busy: [{ staffMemberId: "s1", startMinute: 540, endMinute: 600 }],
    });
    const first = firstDaySlot(params);
    const all = computeDaySlots(params);
    expect(first).toEqual(all[0]);
  });

  it("returns null when nothing fits", () => {
    expect(firstDaySlot(baseParams({ closed: true }))).toBeNull();
  });
});
