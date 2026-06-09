// Data-access for salons: list (with filters + computed next slot) and detail.
// The next-slot computation is the map's killer feature, so it lives next to the
// query that powers the map.

import { prisma } from "./prisma";
import {
  nextAvailableSlot,
  type SalonAvailabilityData,
  type AvailableSlot,
} from "./availability";
import { localStartOfDay, toLocalParts } from "./availability/time";
import { BLOCKING_STATUSES, isSalonCategory, type SalonCategory } from "./enums";
import {
  finalPrice,
  safeJsonArray,
  type NextSlotDTO,
  type SalonDetailDTO,
  type SalonListItemDTO,
} from "./dto";
import type { SalonFilters } from "./validation";
import { WITHIN_2H_MINUTES, HORIZON_DAYS } from "./constants";

export { WITHIN_2H_MINUTES };

function toNextSlotDTO(slot: AvailableSlot | null, now: Date): NextSlotDTO | null {
  if (!slot) return null;
  return {
    startUtc: slot.startUtc.toISOString(),
    label: slot.label,
    inMinutes: Math.round((slot.startUtc.getTime() - now.getTime()) / 60000),
  };
}

interface SalonForNextSlot {
  staff: { id: string }[];
  services: { durationMinutes: number }[];
  workingHours: { weekday: number; openMinute: number; closeMinute: number; closed: boolean }[];
}

function buildAvailabilityData(
  salon: SalonForNextSlot,
  appointments: { staffMemberId: string; startTime: Date; endTime: Date; status: string }[],
): SalonAvailabilityData {
  return {
    workingHours: salon.workingHours,
    staffIds: salon.staff.map((s) => s.id),
    appointments,
  };
}

/** Representative service for the map next-slot: the shortest one (likeliest near slot). */
function representativeDuration(services: { durationMinutes: number }[]): number | null {
  if (services.length === 0) return null;
  return Math.min(...services.map((s) => s.durationMinutes));
}

export async function listSalons(filters: SalonFilters): Promise<SalonListItemDTO[]> {
  const now = new Date();
  const todayParts = toLocalParts(now);
  const windowStart = localStartOfDay(todayParts.year, todayParts.month, todayParts.day);
  const windowEnd = new Date(windowStart.getTime() + (HORIZON_DAYS + 1) * 24 * 60 * 60 * 1000);

  const salons = await prisma.salon.findMany({
    where: {
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.maxPrice ? { priceLevel: { lte: filters.maxPrice } } : {}),
      ...(filters.minRating ? { rating: { gte: filters.minRating } } : {}),
    },
    include: {
      services: { select: { durationMinutes: true, priceRON: true, discountPercent: true } },
      staff: { select: { id: true } },
      workingHours: {
        select: { weekday: true, openMinute: true, closeMinute: true, closed: true },
      },
    },
    orderBy: { rating: "desc" },
  });

  const salonIds = salons.map((s) => s.id);
  const appointments = salonIds.length
    ? await prisma.appointment.findMany({
        where: {
          salonId: { in: salonIds },
          status: { in: BLOCKING_STATUSES },
          startTime: { gte: windowStart, lt: windowEnd },
        },
        select: { salonId: true, staffMemberId: true, startTime: true, endTime: true, status: true },
      })
    : [];

  const bySalon = new Map<string, typeof appointments>();
  for (const appt of appointments) {
    const list = bySalon.get(appt.salonId);
    if (list) list.push(appt);
    else bySalon.set(appt.salonId, [appt]);
  }

  const items: SalonListItemDTO[] = [];
  for (const salon of salons) {
    if (!isSalonCategory(salon.category)) continue;
    const duration = representativeDuration(salon.services);
    const data = buildAvailabilityData(salon, bySalon.get(salon.id) ?? []);
    const slot = duration ? nextAvailableSlot(data, duration, now, HORIZON_DAYS) : null;
    const nextSlot = toNextSlotDTO(slot, now);

    const hasDiscount = salon.services.some((s) => (s.discountPercent ?? 0) > 0);
    const prices = salon.services.map((s) => finalPrice(s.priceRON, s.discountPercent));
    const minPriceRON = prices.length ? Math.min(...prices) : null;
    const photos = safeJsonArray(salon.photos);

    // Apply computed (non-DB) filters.
    if (filters.discount && !hasDiscount) continue;
    if (filters.within2h && (!nextSlot || nextSlot.inMinutes > WITHIN_2H_MINUTES)) continue;

    items.push({
      id: salon.id,
      name: salon.name,
      category: salon.category as SalonCategory,
      address: salon.address,
      lat: salon.lat,
      lng: salon.lng,
      priceLevel: salon.priceLevel,
      rating: salon.rating,
      reviewCount: salon.reviewCount,
      photo: photos[0] ?? null,
      hasDiscount,
      minPriceRON,
      nextSlot,
    });
  }

  return items;
}

export async function getSalonDetail(id: string): Promise<SalonDetailDTO | null> {
  const now = new Date();
  const salon = await prisma.salon.findUnique({
    where: { id },
    include: {
      services: { orderBy: { priceRON: "asc" } },
      staff: true,
      workingHours: { orderBy: { weekday: "asc" } },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { client: { select: { name: true } } },
      },
    },
  });
  if (!salon || !isSalonCategory(salon.category)) return null;

  const todayParts = toLocalParts(now);
  const windowStart = localStartOfDay(todayParts.year, todayParts.month, todayParts.day);
  const windowEnd = new Date(windowStart.getTime() + (HORIZON_DAYS + 1) * 24 * 60 * 60 * 1000);
  const appointments = await prisma.appointment.findMany({
    where: {
      salonId: id,
      status: { in: BLOCKING_STATUSES },
      startTime: { gte: windowStart, lt: windowEnd },
    },
    select: { staffMemberId: true, startTime: true, endTime: true, status: true },
  });

  const duration = representativeDuration(salon.services);
  const data: SalonAvailabilityData = {
    workingHours: salon.workingHours,
    staffIds: salon.staff.map((s) => s.id),
    appointments,
  };
  const slot = duration ? nextAvailableSlot(data, duration, now, HORIZON_DAYS) : null;

  return {
    id: salon.id,
    name: salon.name,
    description: salon.description,
    category: salon.category as SalonCategory,
    address: salon.address,
    lat: salon.lat,
    lng: salon.lng,
    priceLevel: salon.priceLevel,
    rating: salon.rating,
    reviewCount: salon.reviewCount,
    photos: safeJsonArray(salon.photos),
    services: salon.services.map((s) => ({
      id: s.id,
      name: s.name,
      durationMinutes: s.durationMinutes,
      priceRON: s.priceRON,
      discountPercent: s.discountPercent,
      finalPriceRON: finalPrice(s.priceRON, s.discountPercent),
    })),
    staff: salon.staff.map((s) => ({
      id: s.id,
      name: s.name,
      specialties: safeJsonArray(s.specialties),
    })),
    workingHours: salon.workingHours.map((w) => ({
      weekday: w.weekday,
      openMinute: w.openMinute,
      closeMinute: w.closeMinute,
      closed: w.closed,
    })),
    reviews: salon.reviews.map((r) => ({
      id: r.id,
      author: r.client.name,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
    })),
    nextSlot: toNextSlotDTO(slot, now),
  };
}
