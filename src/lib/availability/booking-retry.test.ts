import { describe, it, expect } from "vitest";
import { Prisma, type PrismaClient } from "@prisma/client";
import { bookAppointment, BookingConflictError } from "./booking";

const input = {
  clientId: "c",
  salonId: "s",
  serviceId: "sv",
  staffMemberId: "st",
  startTime: new Date("2026-06-15T08:00:00.000Z"),
  endTime: new Date("2026-06-15T09:00:00.000Z"),
};

const freeTx = {
  appointment: {
    findFirst: async () => null,
    create: async () => ({ id: "ok" }),
  },
};

function knownErr(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("simulated", {
    code,
    clientVersion: "5.22.0",
  });
}

describe("bookAppointment — retry & conflict mapping", () => {
  it("retries once on a P2034 serialization failure, then succeeds", async () => {
    let calls = 0;
    const prisma = {
      $transaction: async (fn: (tx: typeof freeTx) => Promise<{ id: string }>) => {
        calls++;
        if (calls === 1) throw knownErr("P2034");
        return fn(freeTx);
      },
    } as unknown as PrismaClient;

    const res = await bookAppointment(prisma, input);
    expect(res).toEqual({ id: "ok" });
    expect(calls).toBe(2);
  });

  it("maps a P2002 unique-constraint violation to BookingConflictError", async () => {
    const prisma = {
      $transaction: async () => {
        throw knownErr("P2002");
      },
    } as unknown as PrismaClient;
    await expect(bookAppointment(prisma, input)).rejects.toBeInstanceOf(BookingConflictError);
  });

  it("gives up after exhausting retries on persistent P2034", async () => {
    let calls = 0;
    const prisma = {
      $transaction: async () => {
        calls++;
        throw knownErr("P2034");
      },
    } as unknown as PrismaClient;
    await expect(bookAppointment(prisma, input)).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );
    expect(calls).toBe(4); // initial attempt + 3 retries
  });

  it("propagates the BookingConflictError thrown when an overlap is found in-tx", async () => {
    const busyTx = {
      appointment: {
        findFirst: async () => ({ id: "existing" }),
        create: async () => ({ id: "should-not-happen" }),
      },
    };
    const prisma = {
      $transaction: async (fn: (tx: typeof busyTx) => Promise<{ id: string }>) => fn(busyTx),
    } as unknown as PrismaClient;
    await expect(bookAppointment(prisma, input)).rejects.toBeInstanceOf(BookingConflictError);
  });
});
