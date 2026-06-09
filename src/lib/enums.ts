// Enum constants. Stored as String in SQLite for portability; these are the
// single source of truth shared by app code, Zod validation, and seed data.
// On a future Postgres migration these map 1:1 to native enums.

export const ROLES = ["CLIENT", "SALON_OWNER"] as const;
export type Role = (typeof ROLES)[number];

export const SALON_CATEGORIES = ["HAIR", "BARBER", "NAILS", "BEAUTY", "SPA"] as const;
export type SalonCategory = (typeof SALON_CATEGORIES)[number];

export const APPOINTMENT_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

// Statuses that occupy a slot (everything except CANCELLED).
export const BLOCKING_STATUSES: AppointmentStatus[] = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
];

// Romanian display labels for categories (UI is ro-RO).
export const CATEGORY_LABELS: Record<SalonCategory, string> = {
  HAIR: "Coafor",
  BARBER: "Frizerie",
  NAILS: "Unghii",
  BEAUTY: "Salon de înfrumusețare",
  SPA: "Spa",
};

// Marker / badge color per category (mirrors tailwind.config.ts `cat.*`).
export const CATEGORY_COLORS: Record<SalonCategory, string> = {
  HAIR: "#7c3aed",
  BARBER: "#0ea5e9",
  NAILS: "#ec4899",
  BEAUTY: "#f59e0b",
  SPA: "#10b981",
};

export function isSalonCategory(value: string): value is SalonCategory {
  return (SALON_CATEGORIES as readonly string[]).includes(value);
}
