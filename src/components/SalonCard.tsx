"use client";

import Link from "next/link";
import type { SalonListItemDTO } from "@/lib/dto";
import { formatNextSlot, formatPrice, priceLevelSymbol } from "@/lib/format";
import { WITHIN_2H_MINUTES } from "@/lib/constants";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/enums";

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
      className="group block rounded-2xl border border-stone-200/80 bg-white p-3 shadow-sm transition duration-200 hover:border-[#d9c08a] hover:shadow-md"
    >
      <div className="flex gap-3">
        {salon.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={salon.photo}
            alt={salon.name}
            className="h-[76px] w-[76px] shrink-0 rounded-xl object-cover ring-1 ring-stone-900/10"
            loading="lazy"
          />
        ) : (
          <div className="h-[76px] w-[76px] shrink-0 rounded-xl bg-stone-100 ring-1 ring-stone-900/10" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-display text-[15.5px] font-semibold text-stone-900 transition group-hover:text-[#8a682f]">
              {salon.name}
            </h3>
            <span className="mt-0.5 shrink-0 text-[11px] font-medium tracking-wide text-stone-400">
              {priceLevelSymbol(salon.priceLevel)}
            </span>
          </div>

          <p className="mt-0.5 truncate text-[11px] text-stone-400">{salon.address}</p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px]">
            {salon.rating > 0 ? (
              <span className="text-stone-600">
                <span className="text-[#c9a227]">★</span>{" "}
                <span className="font-semibold text-stone-800">{salon.rating.toFixed(1)}</span>{" "}
                <span className="text-stone-400">({salon.reviewCount})</span>
              </span>
            ) : (
              <span className="text-stone-400">Fără recenzii</span>
            )}
            <span className="inline-flex items-center gap-1.5 text-stone-500">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[salon.category] }}
              />
              {CATEGORY_LABELS[salon.category]}
            </span>
            {salon.minPriceRON !== null && (
              <span className="text-stone-400">de la {formatPrice(salon.minPriceRON)}</span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {salon.nextSlot ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                  soon
                    ? "border border-[#d9c08a] bg-[#f6ecd6] text-[#7a5d28]"
                    : "border border-stone-200 bg-stone-50 text-stone-500"
                }`}
              >
                <span
                  className={`h-1 w-1 rounded-full ${
                    soon ? "animate-pulse-dot bg-[#b8923f]" : "bg-stone-400"
                  }`}
                />
                Liber {formatNextSlot(salon.nextSlot.startUtc)}
              </span>
            ) : (
              <span className="text-[10.5px] text-stone-400">Fără disponibilitate apropiată</span>
            )}
            {salon.hasDiscount && (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10.5px] font-semibold text-rose-600">
                Reduceri
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
