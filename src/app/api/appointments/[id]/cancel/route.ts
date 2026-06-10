import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { errorResponse } from "@/lib/apiError";
import { cancelAppointment, AppointmentError } from "@/lib/appointments";

export const dynamic = "force-dynamic";

// POST /api/appointments/:id/cancel — cancel one of the user's appointments,
// subject to the 2h-before-start rule.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return errorResponse("UNAUTHORIZED", "Trebuie să fii autentificat.", 401);
  }

  try {
    await cancelAppointment(session.user.id, params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AppointmentError) {
      const status = err.code === "NOT_FOUND" ? 404 : err.code === "FORBIDDEN" ? 403 : 409;
      const bodyCode = err.code === "UNAVAILABLE" ? "CONFLICT" : err.code;
      return errorResponse(bodyCode, err.message, status);
    }
    console.error(`POST /api/appointments/${params.id}/cancel failed`, err);
    return errorResponse("INTERNAL", "Eroare la anularea programării", 500);
  }
}
