import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { availabilityQuerySchema } from "@/lib/validation";
import { validationError, notFound, errorResponse } from "@/lib/apiError";
import { availableSlotsForDay, parseDateOnly, localStartOfDay } from "@/lib/availability";
import { BLOCKING_STATUSES } from "@/lib/enums";

export const dynamic = "force-dynamic";

// GET /api/salons/:id/availability?serviceId=&date=YYYY-MM-DD
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const query = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = availabilityQuerySchema.safeParse(query);
  if (!parsed.success) return validationError(parsed.error);

  const dateParts = parseDateOnly(parsed.data.date);
  if (!dateParts) {
    return errorResponse("VALIDATION_ERROR", "Dată invalidă", 400);
  }

  try {
    const service = await prisma.service.findFirst({
      where: { id: parsed.data.serviceId, salonId: params.id },
      select: { id: true, durationMinutes: true },
    });
    if (!service) return notFound("Serviciul nu a fost găsit pentru acest salon");

    const [staff, workingHours] = await Promise.all([
      prisma.staffMember.findMany({ where: { salonId: params.id }, select: { id: true } }),
      prisma.workingHours.findMany({
        where: { salonId: params.id },
        select: { weekday: true, openMinute: true, closeMinute: true, closed: true },
      }),
    ]);

    // Appointments occupying staff on the requested local day (± a day for safety).
    const dayStart = localStartOfDay(dateParts.year, dateParts.month, dateParts.day);
    const windowStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);
    const windowEnd = new Date(dayStart.getTime() + 2 * 24 * 60 * 60 * 1000);
    const appointments = await prisma.appointment.findMany({
      where: {
        salonId: params.id,
        status: { in: BLOCKING_STATUSES },
        startTime: { gte: windowStart, lt: windowEnd },
      },
      select: { staffMemberId: true, startTime: true, endTime: true, status: true },
    });

    const slots = availableSlotsForDay(
      { workingHours, staffIds: staff.map((s) => s.id), appointments },
      service.durationMinutes,
      dateParts,
      new Date(),
    );

    return NextResponse.json({
      date: parsed.data.date,
      serviceId: service.id,
      durationMinutes: service.durationMinutes,
      slots: slots.map((s) => ({
        startUtc: s.startUtc.toISOString(),
        label: s.label,
        freeStaffIds: s.freeStaffIds,
      })),
    });
  } catch (err) {
    console.error(`GET /api/salons/${params.id}/availability failed`, err);
    return errorResponse("INTERNAL", "Eroare la calcularea disponibilității", 500);
  }
}
