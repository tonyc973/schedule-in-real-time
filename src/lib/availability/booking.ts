// Booking with conflict detection.
//
// Two layers:
//   1. A pure conflict model (`hasConflict`, `InMemoryBookingStore`) that mirrors
//      the DB's behaviour and is unit-tested for the double-booking race.
//   2. `bookAppointment`, the real transactional path that relies on the
//      @@unique([staffMemberId, startTime]) constraint plus an in-transaction
//      overlap check so two simultaneous requests yield exactly one success.

import { intervalsOverlap } from "./slots";
import { BLOCKING_STATUSES } from "../enums";
import type { Prisma, PrismaClient } from "@prisma/client";

export interface ExistingBooking {
  staffMemberId: string;
  start: number; // epoch ms or minutes — any consistent numeric scale
  end: number;
  cancelled?: boolean;
}

export interface BookingCandidate {
  staffMemberId: string;
  start: number;
  end: number;
}

/** Does the candidate overlap any non-cancelled booking for the same staff? */
export function hasConflict(
  existing: ExistingBooking[],
  candidate: BookingCandidate,
): boolean {
  return existing.some(
    (b) =>
      !b.cancelled &&
      b.staffMemberId === candidate.staffMemberId &&
      intervalsOverlap(candidate.start, candidate.end, b.start, b.end),
  );
}

export class BookingConflictError extends Error {
  constructor(message = "Slot indisponibil — a fost rezervat de altcineva.") {
    super(message);
    this.name = "BookingConflictError";
  }
}

/**
 * Minimal model of the DB guarantee: a staff member can hold exactly one
 * appointment starting at a given instant. Used to test the double-booking race
 * deterministically without a database.
 */
export class InMemoryBookingStore {
  private readonly bookings: ExistingBooking[] = [];
  // Emulates the @@unique([staffMemberId, startTime]) constraint.
  private readonly takenKeys = new Set<string>();

  private key(staffMemberId: string, start: number): string {
    return `${staffMemberId}@${start}`;
  }

  list(): ExistingBooking[] {
    return [...this.bookings];
  }

  /** Attempt to book; throws BookingConflictError if the slot is taken. */
  book(candidate: BookingCandidate): ExistingBooking {
    if (hasConflict(this.bookings, candidate)) {
      throw new BookingConflictError();
    }
    const key = this.key(candidate.staffMemberId, candidate.start);
    if (this.takenKeys.has(key)) {
      throw new BookingConflictError();
    }
    this.takenKeys.add(key);
    const booking: ExistingBooking = { ...candidate };
    this.bookings.push(booking);
    return booking;
  }
}

export interface BookAppointmentInput {
  clientId: string;
  salonId: string;
  serviceId: string;
  staffMemberId: string;
  startTime: Date; // UTC
  endTime: Date; // UTC
}

/**
 * Transactionally create an appointment, rejecting double-bookings.
 *
 * Conflict detection is twofold:
 *   - inside a serializable-style transaction we re-check for any blocking
 *     appointment whose [start,end) overlaps the requested span for this staff
 *     member, and
 *   - the DB @@unique([staffMemberId, startTime]) constraint is the hard backstop
 *     if two transactions race past the read.
 *
 * Either way, exactly one of two simultaneous identical requests succeeds; the
 * loser gets a BookingConflictError.
 */
export async function bookAppointment(
  prisma: PrismaClient,
  input: BookAppointmentInput,
): Promise<{ id: string }> {
  try {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const overlapping = await tx.appointment.findFirst({
        where: {
          staffMemberId: input.staffMemberId,
          status: { in: BLOCKING_STATUSES },
          // overlap: existing.start < newEnd AND existing.end > newStart
          startTime: { lt: input.endTime },
          endTime: { gt: input.startTime },
        },
        select: { id: true },
      });
      if (overlapping) {
        throw new BookingConflictError();
      }
      const created = await tx.appointment.create({
        data: {
          clientId: input.clientId,
          salonId: input.salonId,
          serviceId: input.serviceId,
          staffMemberId: input.staffMemberId,
          startTime: input.startTime,
          endTime: input.endTime,
          status: "PENDING",
        },
        select: { id: true },
      });
      return created;
    });
  } catch (err) {
    // Unique-constraint violation (P2002) means another tx won the race.
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      throw new BookingConflictError();
    }
    throw err;
  }
}
