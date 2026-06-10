import { NextResponse } from "next/server";
import type { ZodError } from "zod";

// API routes return typed errors: { error: { code, message } }.
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INTERNAL";

export function errorResponse(code: ApiErrorCode, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function validationError(err: ZodError) {
  const first = err.errors[0];
  const message = first ? `${first.path.join(".") || "input"}: ${first.message}` : "Date invalide";
  return errorResponse("VALIDATION_ERROR", message, 400);
}

export function notFound(message = "Resursa nu a fost găsită") {
  return errorResponse("NOT_FOUND", message, 404);
}
