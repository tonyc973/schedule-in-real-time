import { NextRequest, NextResponse } from "next/server";
import { salonFiltersSchema } from "@/lib/validation";
import { listSalons } from "@/lib/salons";
import { validationError, errorResponse } from "@/lib/apiError";

export const dynamic = "force-dynamic";

// GET /api/salons?category=&maxPrice=&minRating=&discount=&within2h=
export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = salonFiltersSchema.safeParse(params);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const salons = await listSalons(parsed.data);
    return NextResponse.json({ salons });
  } catch (err) {
    console.error("GET /api/salons failed", err);
    return errorResponse("INTERNAL", "Eroare la încărcarea saloanelor", 500);
  }
}
