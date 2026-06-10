import { z } from "zod";
import { SALON_CATEGORIES } from "./enums";

// Coerce "" / missing into undefined so optional filters drop out cleanly.
const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const salonFiltersSchema = z.object({
  category: z.preprocess(emptyToUndefined, z.enum(SALON_CATEGORIES).optional()),
  maxPrice: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(3).optional()),
  minRating: z.preprocess(emptyToUndefined, z.coerce.number().min(0).max(5).optional()),
  discount: z.preprocess(emptyToUndefined, z.coerce.boolean().optional()),
  within2h: z.preprocess(emptyToUndefined, z.coerce.boolean().optional()),
});

export type SalonFilters = z.infer<typeof salonFiltersSchema>;

export const availabilityQuerySchema = z.object({
  serviceId: z.string().min(1, "serviceId este obligatoriu"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date trebuie să fie în format YYYY-MM-DD"),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Numele trebuie să aibă cel puțin 2 caractere").max(80),
  email: z.string().trim().toLowerCase().email("Email invalid"),
  password: z.string().min(8, "Parola trebuie să aibă cel puțin 8 caractere").max(100),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// staffMemberId omitted/empty => "oricine" (any available staff member).
export const createAppointmentSchema = z.object({
  salonId: z.string().min(1, "salonId este obligatoriu"),
  serviceId: z.string().min(1, "serviceId este obligatoriu"),
  staffMemberId: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.string().min(1).optional(),
  ),
  startUtc: z.string().datetime({ message: "startUtc trebuie să fie o dată ISO validă" }),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
