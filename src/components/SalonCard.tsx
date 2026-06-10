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
      className="group block rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 transition duration-200 hover:border-[#e8c97d]/30 hover:bg-white/[0.06]"
    >
      <div className="flex gap-3">
        {salon.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={salon.photo}
            alt={salon.name}
            className="h-[76px] w-[76px] shrink-0 rounded-xl object-cover ring-1 ring-white/10"
            loading="lazy"
          />
        ) : (
          <div className="h-[76px] w-[76px] shrink-0 rounded-xl bg-white/[0.05] ring-1 ring-white/10" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-display text-[15.5px] font-semibold text-stone-100 transition group-hover:text-[#ecd9a8]">
              {salon.name}
            </h3>
            <span className="mt-0.5 shrink-0 text-[11px] font-medium tracking-wide text-stone-500">
              {priceLevelSymbol(salon.priceLevel)}
            </span>
          </div>

          <p className="mt-0.5 truncate text-[11px] text-stone-500">{salon.address}</p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px]">
            {salon.rating > 0 ? (
              <span className="text-stone-300">
                <span className="text-[#e8c97d]">★</span>{" "}
                <span className="font-semibold">{salon.rating.toFixed(1)}</span>{" "}
                <span className="text-stone-600">({salon.reviewCount})</span>
              </span>
            ) : (
              <span className="text-stone-600">Fără recenzii</span>
            )}
            <span className="inline-flex items-center gap-1.5 text-stone-400">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[salon.category] }}
              />
              {CATEGORY_LABELS[salon.category]}
            </span>
            {salon.minPriceRON !== null && (
              <span className="text-stone-500">de la {formatPrice(salon.minPriceRON)}</span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {salon.nextSlot ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                  soon
                    ? "border border-[#e8c97d]/30 bg-[#e8c97d]/[0.12] text-[#ecd9a8]"
                    : "border border-white/[0.08] bg-white/[0.04] text-stone-400"
                }`}
              >
                <span
                  className={`h-1 w-1 rounded-full ${
                    soon ? "animate-pulse-dot bg-[#e8c97d]" : "bg-stone-500"
                  }`}
                />
                Liber {formatNextSlot(salon.nextSlot.startUtc)}
              </span>
            ) : (
              <span className="text-[10.5px] text-stone-600">Fără disponibilitate apropiată</span>
            )}
            {salon.hasDiscount && (
              <span className="rounded-full border border-rose-300/30 bg-rose-400/10 px-2 py-0.5 text-[10.5px] font-semibold text-rose-200">
                Reduceri
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
