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
