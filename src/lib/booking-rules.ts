// Pure booking-policy rules, kept DB-free so they are unit-testable.

import { CANCEL_WINDOW_MINUTES } from "./constants";

export type CancelCheck =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Whether an appointment may be cancelled now.
 * Rule: only PENDING/CONFIRMED appointments, and only up to
 * CANCEL_WINDOW_MINUTES (2h) before the start time.
 */
export function canCancelAppointment(
  startTime: Date,
  now: Date,
  status: string,
  windowMinutes: number = CANCEL_WINDOW_MINUTES,
): CancelCheck {
  if (status === "CANCELLED") return { ok: false, reason: "Programarea este deja anulată." };
  if (status === "COMPLETED") return { ok: false, reason: "Programarea a fost deja finalizată." };
  const cutoff = startTime.getTime() - windowMinutes * 60_000;
  if (now.getTime() > cutoff) {
    return {
      ok: false,
      reason: `Anularea este permisă cel târziu cu ${windowMinutes / 60}h înainte de programare.`,
    };
  }
  return { ok: true };
}

export type StaffSelection =
  | { ok: true; staffMemberId: string }
  | { ok: false; reason: string };

/**
 * Resolve which staff member serves a slot.
 *  - "oricine" (no requestedStaffId) → the first free staff member.
 *  - a specific request → honoured only if that member is actually free.
 */
export function selectStaffForSlot(
  freeStaffIds: string[],
  requestedStaffId?: string,
): StaffSelection {
  if (freeStaffIds.length === 0) {
    return { ok: false, reason: "Intervalul nu mai este disponibil." };
  }
  if (requestedStaffId) {
    if (!freeStaffIds.includes(requestedStaffId)) {
      return { ok: false, reason: "Specialistul ales nu este disponibil în acest interval." };
    }
    return { ok: true, staffMemberId: requestedStaffId };
  }
  return { ok: true, staffMemberId: freeStaffIds[0] };
}
