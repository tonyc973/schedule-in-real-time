import { NextRequest, NextResponse } from "next/server";
import { getSalonDetail } from "@/lib/salons";
import { notFound, errorResponse } from "@/lib/apiError";

export const dynamic = "force-dynamic";

// GET /api/salons/:id
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const salon = await getSalonDetail(params.id);
    if (!salon) return notFound("Salonul nu a fost găsit");
    return NextResponse.json({ salon });
  } catch (err) {
    console.error(`GET /api/salons/${params.id} failed`, err);
    return errorResponse("INTERNAL", "Eroare la încărcarea salonului", 500);
  }
}
