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
import { Prisma, type PrismaClient } from "@prisma/client";

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

const MAX_BOOKING_RETRIES = 3;

/**
 * Serializable isolation is what makes the read-overlap-then-insert atomic
 * against concurrent writers. Prisma only supports an explicit isolation level
 * on server databases (Postgres/MySQL/SQL Server); SQLite already serializes
 * writes, so we omit the option there to avoid a runtime "isolation levels are
 * not supported" error in dev. The schema is Postgres-compatible (see
 * CLAUDE.md), so in production this runs Serializable.
 */
function serializableTxOptions(): { isolationLevel: Prisma.TransactionIsolationLevel } | undefined {
  const url = process.env.DATABASE_URL ?? "";
  if (/^(postgres(ql)?|mysql|sqlserver):/i.test(url)) {
    return { isolationLevel: Prisma.TransactionIsolationLevel.Serializable };
  }
  return undefined;
}

function isKnownCode(err: unknown, code: string): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === code;
}

/**
 * Transactionally create an appointment, rejecting double-bookings.
 *
 * Conflict detection is layered:
 *   1. Inside a Serializable transaction (on databases that support it) we
 *      re-check for any blocking appointment whose [start,end) overlaps the
 *      requested span for this staff member — this is what prevents overlapping
 *      bookings with *different* start times, which the unique index cannot.
 *   2. The @@unique([staffMemberId, startTime]) constraint is the hard backstop
 *      for the identical-start race (surfaces as P2002).
 *   3. A serialization failure (P2034) under contention is retried transparently
 *      a few times before giving up.
 *
 * Net effect: of two concurrent requests that would overlap on the same staff
 * member, exactly one succeeds; the loser gets a BookingConflictError.
 */
export async function bookAppointment(
  prisma: PrismaClient,
  input: BookAppointmentInput,
): Promise<{ id: string }> {
  const txOptions = serializableTxOptions();

  for (let attempt = 0; ; attempt++) {
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
        return await tx.appointment.create({
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
      }, txOptions);
    } catch (err) {
      // Identical-start race lost to the unique constraint → genuine conflict.
      if (isKnownCode(err, "P2002")) {
        throw new BookingConflictError();
      }
      // Serializable write conflict → retry a bounded number of times.
      if (isKnownCode(err, "P2034") && attempt < MAX_BOOKING_RETRIES) {
        continue;
      }
      throw err;
    }
  }
}
