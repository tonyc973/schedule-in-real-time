import { describe, it, expect } from "vitest";
import { canCancelAppointment, selectStaffForSlot } from "./booking-rules";

describe("canCancelAppointment", () => {
  const start = new Date("2026-06-15T10:00:00.000Z");

  it("allows cancelling more than 2h before start", () => {
    const now = new Date("2026-06-15T07:30:00.000Z"); // 2h30 before
    expect(canCancelAppointment(start, now, "CONFIRMED")).toEqual({ ok: true });
  });

  it("rejects cancelling at exactly under 2h before start", () => {
    const now = new Date("2026-06-15T08:30:00.000Z"); // 1h30 before
    const res = canCancelAppointment(start, now, "CONFIRMED");
    expect(res.ok).toBe(false);
  });

  it("treats the 2h boundary as still cancellable", () => {
    const now = new Date("2026-06-15T08:00:00.000Z"); // exactly 2h before
    expect(canCancelAppointment(start, now, "PENDING")).toEqual({ ok: true });
  });

  it("rejects already-cancelled and completed appointments", () => {
    const now = new Date("2026-06-15T06:00:00.000Z");
    expect(canCancelAppointment(start, now, "CANCELLED").ok).toBe(false);
    expect(canCancelAppointment(start, now, "COMPLETED").ok).toBe(false);
  });
});

describe("selectStaffForSlot", () => {
  it("picks the first free staff for 'oricine'", () => {
    expect(selectStaffForSlot(["a", "b"])).toEqual({ ok: true, staffMemberId: "a" });
  });

  it("honours a specific free staff request", () => {
    expect(selectStaffForSlot(["a", "b"], "b")).toEqual({ ok: true, staffMemberId: "b" });
  });

  it("rejects a request for a busy staff member", () => {
    const res = selectStaffForSlot(["a"], "b");
    expect(res.ok).toBe(false);
  });

  it("rejects when nobody is free", () => {
    expect(selectStaffForSlot([]).ok).toBe(false);
    expect(selectStaffForSlot([], "a").ok).toBe(false);
  });
});
