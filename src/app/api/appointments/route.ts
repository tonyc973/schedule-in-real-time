import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAppointmentSchema } from "@/lib/validation";
import { validationError, errorResponse } from "@/lib/apiError";
import {
  createAppointment,
  listUserAppointments,
  AppointmentError,
} from "@/lib/appointments";

export const dynamic = "force-dynamic";

const ERROR_STATUS: Record<AppointmentError["code"], number> = {
  NOT_FOUND: 404,
  UNAVAILABLE: 409,
  FORBIDDEN: 403,
  CONFLICT: 409,
};

// GET /api/appointments — the signed-in user's appointments (upcoming + past).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return errorResponse("UNAUTHORIZED", "Trebuie să fii autentificat.", 401);
  }
  try {
    const data = await listUserAppointments(session.user.id);
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/appointments failed", err);
    return errorResponse("INTERNAL", "Eroare la încărcarea programărilor", 500);
  }
}

// POST /api/appointments — create a booking (auth required: the confirm step).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return errorResponse("UNAUTHORIZED", "Autentifică-te pentru a finaliza rezervarea.", 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "Corp JSON invalid", 400);
  }

  const parsed = createAppointmentSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const result = await createAppointment({
      userId: session.user.id,
      salonId: parsed.data.salonId,
      serviceId: parsed.data.serviceId,
      staffMemberId: parsed.data.staffMemberId,
      startUtc: new Date(parsed.data.startUtc),
    });
    return NextResponse.json({ appointment: result }, { status: 201 });
  } catch (err) {
    if (err instanceof AppointmentError) {
      // UNAVAILABLE is a 409 conflict to clients; other codes map 1:1 to ApiErrorCode.
      const bodyCode = err.code === "UNAVAILABLE" ? "CONFLICT" : err.code;
      return errorResponse(bodyCode, err.message, ERROR_STATUS[err.code]);
    }
    console.error("POST /api/appointments failed", err);
    return errorResponse("INTERNAL", "Eroare la crearea programării", 500);
  }
}
