// Server-side appointment operations: create (with server-recomputed, re-validated
// availability), list for a user, and cancel. Booking conflict safety comes from
// bookAppointment (transaction + @@unique); this layer adds authorization and the
// business policy (slot must really be available, 2h cancel window).

import { prisma } from "./prisma";
import {
  availableSlotsForDay,
  bookAppointment,
  BookingConflictError,
  parseDateOnly,
} from "./availability";
import { localStartOfDay, toLocalParts } from "./availability/time";
import { canCancelAppointment, selectStaffForSlot } from "./booking-rules";
import { BLOCKING_STATUSES, isSalonCategory, type SalonCategory } from "./enums";
import { finalPrice, type AppointmentDTO } from "./dto";
import { HORIZON_DAYS } from "./constants";

export class AppointmentError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "UNAVAILABLE" | "FORBIDDEN" | "CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "AppointmentError";
  }
}

export interface CreateAppointmentParams {
  userId: string;
  salonId: string;
  serviceId: string;
  staffMemberId?: string;
  startUtc: Date;
}

/**
 * Create an appointment. The server NEVER trusts the client's idea of duration,
 * end time or availability: it recomputes the day's slots and only books if the
 * requested start is genuinely free (anti-tampering), then picks/validates staff.
 */
export async function createAppointment(params: CreateAppointmentParams): Promise<{ id: string }> {
  const { userId, salonId, serviceId, staffMemberId, startUtc } = params;

  const service = await prisma.service.findFirst({
    where: { id: serviceId, salonId },
    select: { id: true, durationMinutes: true },
  });
  if (!service) throw new AppointmentError("NOT_FOUND", "Serviciul nu a fost găsit pentru acest salon.");

  // Determine the local calendar day of the requested start.
  const parts = toLocalParts(startUtc);
  const localDay = { year: parts.year, month: parts.month, day: parts.day };

  const [staff, workingHours] = await Promise.all([
    prisma.staffMember.findMany({ where: { salonId }, select: { id: true } }),
    prisma.workingHours.findMany({
      where: { salonId },
      select: { weekday: true, openMinute: true, closeMinute: true, closed: true },
    }),
  ]);

  const dayStart = localStartOfDay(localDay.year, localDay.month, localDay.day);
  const windowStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);
  const windowEnd = new Date(dayStart.getTime() + 2 * 24 * 60 * 60 * 1000);
  const appointments = await prisma.appointment.findMany({
    where: {
      salonId,
      status: { in: BLOCKING_STATUSES },
      startTime: { gte: windowStart, lt: windowEnd },
    },
    select: { staffMemberId: true, startTime: true, endTime: true, status: true },
  });

  const slots = availableSlotsForDay(
    { workingHours, staffIds: staff.map((s) => s.id), appointments },
    service.durationMinutes,
    localDay,
    new Date(),
  );

  // Match by exact instant.
  const slot = slots.find((s) => s.startUtc.getTime() === startUtc.getTime());
  if (!slot) {
    throw new AppointmentError("UNAVAILABLE", "Intervalul selectat nu mai este disponibil.");
  }

  // Candidate staff to attempt, in order. A specific request resolves to a single
  // (validated-free) member; "Oricine" tries every free member so that losing a
  // race for one still books another who is free for the same slot.
  let candidates: string[];
  if (staffMemberId) {
    const selection = selectStaffForSlot(slot.freeStaffIds, staffMemberId);
    if (!selection.ok) {
      throw new AppointmentError("UNAVAILABLE", selection.reason);
    }
    candidates = [selection.staffMemberId];
  } else {
    if (slot.freeStaffIds.length === 0) {
      throw new AppointmentError("UNAVAILABLE", "Intervalul nu mai este disponibil.");
    }
    candidates = slot.freeStaffIds;
  }

  const endUtc = new Date(startUtc.getTime() + service.durationMinutes * 60_000);
  let lastConflict: AppointmentError | null = null;
  for (const candidate of candidates) {
    try {
      return await bookAppointment(prisma, {
        clientId: userId,
        salonId,
        serviceId: service.id,
        staffMemberId: candidate,
        startTime: startUtc,
        endTime: endUtc,
      });
    } catch (err) {
      if (err instanceof BookingConflictError) {
        // This member was taken by a concurrent booking — try the next free one.
        lastConflict = new AppointmentError("CONFLICT", err.message);
        continue;
      }
      throw err;
    }
  }
  throw lastConflict ?? new AppointmentError("CONFLICT", "Intervalul nu mai este disponibil.");
}

function toAppointmentDTO(
  appt: {
    id: string;
    status: string;
    startTime: Date;
    endTime: Date;
    service: { name: string; durationMinutes: number; priceRON: number; discountPercent: number | null };
    staffMember: { name: string };
    salon: { id: string; name: string; address: string; category: string };
  },
  now: Date,
): AppointmentDTO {
  const cancel = canCancelAppointment(appt.startTime, now, appt.status);
  const category: SalonCategory = isSalonCategory(appt.salon.category)
    ? appt.salon.category
    : "HAIR";
  return {
    id: appt.id,
    status: appt.status,
    startUtc: appt.startTime.toISOString(),
    endUtc: appt.endTime.toISOString(),
    durationMinutes: appt.service.durationMinutes,
    priceRON: finalPrice(appt.service.priceRON, appt.service.discountPercent),
    salon: {
      id: appt.salon.id,
      name: appt.salon.name,
      address: appt.salon.address,
      category,
    },
    serviceName: appt.service.name,
    staffName: appt.staffMember.name,
    canCancel: cancel.ok,
    cancelReason: cancel.ok ? null : cancel.reason,
  };
}

export interface UserAppointments {
  upcoming: AppointmentDTO[];
  past: AppointmentDTO[];
}

export async function listUserAppointments(userId: string): Promise<UserAppointments> {
  const now = new Date();
  const rows = await prisma.appointment.findMany({
    where: { clientId: userId },
    orderBy: { startTime: "desc" },
    include: {
      service: { select: { name: true, durationMinutes: true, priceRON: true, discountPercent: true } },
      staffMember: { select: { name: true } },
      salon: { select: { id: true, name: true, address: true, category: true } },
    },
  });

  const upcoming: AppointmentDTO[] = [];
  const past: AppointmentDTO[] = [];
  for (const row of rows) {
    const dto = toAppointmentDTO(row, now);
    const isPast = row.endTime.getTime() < now.getTime();
    const isClosed = row.status === "CANCELLED" || row.status === "COMPLETED";
    if (isPast || isClosed) past.push(dto);
    else upcoming.push(dto);
  }
  // Upcoming should read soonest-first.
  upcoming.sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime());
  return { upcoming, past };
}

export async function cancelAppointment(userId: string, appointmentId: string): Promise<void> {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, clientId: true, startTime: true, status: true },
  });
  if (!appt) throw new AppointmentError("NOT_FOUND", "Programarea nu a fost găsită.");
  if (appt.clientId !== userId) {
    throw new AppointmentError("FORBIDDEN", "Nu poți anula această programare.");
  }
  const check = canCancelAppointment(appt.startTime, new Date(), appt.status);
  if (!check.ok) {
    throw new AppointmentError("CONFLICT", check.reason);
  }
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "CANCELLED" },
  });
}

export { HORIZON_DAYS };
