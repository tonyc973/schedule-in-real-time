"use client";

import Link from "next/link";
import type { SalonListItemDTO } from "@/lib/dto";
import { formatNextSlot, formatPrice } from "@/lib/format";
import { WITHIN_2H_MINUTES } from "@/lib/constants";
import {
  CategoryBadge,
  DiscountBadge,
  NextSlotBadge,
  PriceLevel,
  RatingStars,
} from "./ui";

export default function SalonCard({
  salon,
  onHover,
}: {
  salon: SalonListItemDTO;
  onHover?: (id: string | null) => void;
}) {
  const soon = !!salon.nextSlot && salon.nextSlot.inMinutes <= WITHIN_2H_MINUTES;

  return (
    <Link
      href={`/salon/${salon.id}`}
      onMouseEnter={() => onHover?.(salon.id)}
      onMouseLeave={() => onHover?.(null)}
      className="block rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex gap-3">
        {salon.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={salon.photo}
            alt={salon.name}
            className="h-20 w-20 shrink-0 rounded-lg object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-20 w-20 shrink-0 rounded-lg bg-slate-100" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold text-slate-900">{salon.name}</h3>
            <PriceLevel level={salon.priceLevel} />
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{salon.address}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <CategoryBadge category={salon.category} />
            <RatingStars rating={salon.rating} count={salon.reviewCount} />
            {salon.minPriceRON !== null && (
              <span className="text-xs text-slate-500">de la {formatPrice(salon.minPriceRON)}</span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {salon.nextSlot ? (
              <NextSlotBadge label={`Liber ${formatNextSlot(salon.nextSlot.startUtc)}`} soon={soon} />
            ) : (
              <span className="text-xs text-slate-400">Fără disponibilitate apropiată</span>
            )}
            {salon.hasDiscount && <DiscountBadge />}
          </div>
        </div>
      </div>
    </Link>
  );
}
