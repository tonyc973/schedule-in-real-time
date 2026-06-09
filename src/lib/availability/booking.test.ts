import { describe, it, expect } from "vitest";
import {
  hasConflict,
  InMemoryBookingStore,
  BookingConflictError,
  type ExistingBooking,
} from "./booking";

describe("hasConflict", () => {
  const existing: ExistingBooking[] = [
    { staffMemberId: "s1", start: 600, end: 660 },
  ];

  it("detects an overlapping booking for the same staff", () => {
    expect(hasConflict(existing, { staffMemberId: "s1", start: 630, end: 690 })).toBe(true);
  });

  it("ignores back-to-back (touching) bookings", () => {
    expect(hasConflict(existing, { staffMemberId: "s1", start: 660, end: 720 })).toBe(false);
  });

  it("ignores overlaps for a different staff member", () => {
    expect(hasConflict(existing, { staffMemberId: "s2", start: 630, end: 690 })).toBe(false);
  });

  it("ignores cancelled bookings", () => {
    const withCancelled: ExistingBooking[] = [
      { staffMemberId: "s1", start: 600, end: 660, cancelled: true },
    ];
    expect(hasConflict(withCancelled, { staffMemberId: "s1", start: 630, end: 690 })).toBe(false);
  });
});

describe("double-booking race", () => {
  it("lets exactly one of two simultaneous identical requests succeed", () => {
    const store = new InMemoryBookingStore();
    const candidate = { staffMemberId: "s1", start: 600, end: 660 };

    // Simulate two requests racing for the same slot.
    const results = [candidate, candidate].map((c) => {
      try {
        store.book(c);
        return "ok" as const;
      } catch (err) {
        expect(err).toBeInstanceOf(BookingConflictError);
        return "conflict" as const;
      }
    });

    expect(results.filter((r) => r === "ok")).toHaveLength(1);
    expect(results.filter((r) => r === "conflict")).toHaveLength(1);
    expect(store.list()).toHaveLength(1);
  });

  it("rejects a later overlapping (not identical) booking too", () => {
    const store = new InMemoryBookingStore();
    store.book({ staffMemberId: "s1", start: 600, end: 660 });
    expect(() => store.book({ staffMemberId: "s1", start: 630, end: 690 })).toThrow(
      BookingConflictError,
    );
    expect(store.list()).toHaveLength(1);
  });

  it("allows a non-overlapping booking for the same staff", () => {
    const store = new InMemoryBookingStore();
    store.book({ staffMemberId: "s1", start: 600, end: 660 });
    store.book({ staffMemberId: "s1", start: 660, end: 720 });
    expect(store.list()).toHaveLength(2);
  });
});
