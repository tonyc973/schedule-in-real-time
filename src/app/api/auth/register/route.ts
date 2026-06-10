import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { validationError, errorResponse } from "@/lib/apiError";

export const dynamic = "force-dynamic";

// POST /api/auth/register — create a CLIENT account (browsing stays anonymous;
// this only matters when someone wants to book).
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "Corp JSON invalid", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  // NOTE: a distinct 409 here lets a caller probe which emails have accounts
  // (user enumeration). For this booking app the clear UX ("email already in
  // use") is the deliberate trade-off; a privacy-hardened deployment would
  // return a neutral response and add rate limiting.
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return errorResponse("CONFLICT", "Există deja un cont cu acest email.", 409);
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: "CLIENT",
    },
    select: { id: true, email: true, name: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
