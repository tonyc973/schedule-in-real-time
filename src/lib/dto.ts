// Serializable DTOs returned by the API and consumed by client components.
// All Dates are ISO strings; JSON-encoded DB columns (photos, specialties) are
// parsed into real arrays here.

import type { SalonCategory } from "./enums";

export interface NextSlotDTO {
  startUtc: string; // ISO
  label: string; // "HH:MM" local
  inMinutes: number; // minutes from now
}

export interface SalonListItemDTO {
  id: string;
  name: string;
  category: SalonCategory;
  address: string;
  lat: number;
  lng: number;
  priceLevel: number;
  rating: number;
  reviewCount: number;
  photo: string | null;
  hasDiscount: boolean;
  minPriceRON: number | null;
  nextSlot: NextSlotDTO | null;
}

export interface ServiceDTO {
  id: string;
  name: string;
  durationMinutes: number;
  priceRON: number;
  discountPercent: number | null;
  finalPriceRON: number;
}

export interface StaffDTO {
  id: string;
  name: string;
  specialties: string[];
}

export interface WorkingHoursDTO {
  weekday: number;
  openMinute: number;
  closeMinute: number;
  closed: boolean;
}

export interface ReviewDTO {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface SalonDetailDTO {
  id: string;
  name: string;
  description: string;
  category: SalonCategory;
  address: string;
  lat: number;
  lng: number;
  priceLevel: number;
  rating: number;
  reviewCount: number;
  photos: string[];
  services: ServiceDTO[];
  staff: StaffDTO[];
  workingHours: WorkingHoursDTO[];
  reviews: ReviewDTO[];
  nextSlot: NextSlotDTO | null;
}

export interface AppointmentDTO {
  id: string;
  status: string;
  startUtc: string;
  endUtc: string;
  durationMinutes: number;
  priceRON: number; // final price actually charged (discount applied)
  salon: { id: string; name: string; address: string; category: SalonCategory };
  serviceName: string;
  staffName: string;
  canCancel: boolean;
  cancelReason: string | null;
}

export function safeJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function finalPrice(priceRON: number, discountPercent: number | null): number {
  if (!discountPercent) return priceRON;
  return Math.round(priceRON * (1 - discountPercent / 100));
}
