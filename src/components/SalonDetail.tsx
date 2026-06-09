"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { SalonDetailDTO } from "@/lib/dto";
import { formatDuration, formatNextSlot, formatPrice } from "@/lib/format";
import { WITHIN_2H_MINUTES } from "@/lib/constants";
import { CategoryBadge, DiscountBadge, NextSlotBadge, PriceLevel, RatingStars } from "./ui";

const MiniMap = dynamic(() => import("./MiniMap"), {
  ssr: false,
  loading: () => <div className="h-56 w-full animate-pulse rounded-xl bg-slate-100" />,
});

const WEEKDAYS_RO = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon → Sun

function minuteLabel(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export default function SalonDetail({ salon }: { salon: SalonDetailDTO }) {
  const [activePhoto, setActivePhoto] = useState(0);
  const soon = !!salon.nextSlot && salon.nextSlot.inMinutes <= WITHIN_2H_MINUTES;
  const hasDiscount = salon.services.some((s) => (s.discountPercent ?? 0) > 0);
  const whByDay = new Map(salon.workingHours.map((w) => [w.weekday, w]));

  return (
    <div className="min-h-[100dvh] bg-slate-50 pb-16">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Înapoi la hartă
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4">
        {/* Gallery */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {salon.photos.length > 0 ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={salon.photos[activePhoto]}
                alt={salon.name}
                className="h-72 w-full object-cover"
              />
              {salon.photos.length > 1 && (
                <div className="flex gap-2 p-2">
                  {salon.photos.map((p, i) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setActivePhoto(i)}
                      className={`h-14 w-20 overflow-hidden rounded-lg border-2 ${
                        i === activePhoto ? "border-slate-900" : "border-transparent"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="h-72 w-full bg-slate-100" />
          )}
        </div>

        {/* Header info */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{salon.name}</h1>
              <p className="mt-1 text-sm text-slate-500">{salon.address}</p>
            </div>
            <PriceLevel level={salon.priceLevel} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CategoryBadge category={salon.category} />
            <RatingStars rating={salon.rating} count={salon.reviewCount} />
            {salon.nextSlot ? (
              <NextSlotBadge label={`Liber ${formatNextSlot(salon.nextSlot.startUtc)}`} soon={soon} />
            ) : (
              <span className="text-xs text-slate-400">Fără disponibilitate apropiată</span>
            )}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{salon.description}</p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {/* Services */}
          <section className="md:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-900">Servicii</h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {salon.services.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-slate-800">{s.name}</p>
                      <p className="text-xs text-slate-500">{formatDuration(s.durationMinutes)}</p>
                    </div>
                    <div className="text-right">
                      {s.discountPercent ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 line-through">
                            {formatPrice(s.priceRON)}
                          </span>
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                            -{s.discountPercent}%
                          </span>
                          <span className="font-semibold text-slate-900">
                            {formatPrice(s.finalPriceRON)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-semibold text-slate-900">{formatPrice(s.priceRON)}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {hasDiscount && (
                <div className="mt-2">
                  <DiscountBadge />
                </div>
              )}
              <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Rezervarea online va fi disponibilă în curând (Pasul 2).
              </p>
            </div>

            {/* Staff */}
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-900">Echipă</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {salon.staff.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <p className="text-sm font-medium text-slate-800">{m.name}</p>
                    {m.specialties.length > 0 && (
                      <p className="text-xs text-slate-500">{m.specialties.join(", ")}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Recenzii{" "}
                <span className="text-sm font-normal text-slate-400">({salon.reviewCount})</span>
              </h2>
              {salon.reviews.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Acest salon nu are încă recenzii.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {salon.reviews.map((r) => (
                    <li key={r.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-800">{r.author}</span>
                        <span className="text-amber-500">{"★".repeat(r.rating)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{r.comment}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Sidebar: hours + map */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-900">Program</h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {WEEKDAY_ORDER.map((wd) => {
                  const w = whByDay.get(wd);
                  return (
                    <li key={wd} className="flex items-center justify-between">
                      <span className="text-slate-600">{WEEKDAYS_RO[wd]}</span>
                      {!w || w.closed ? (
                        <span className="text-slate-400">Închis</span>
                      ) : (
                        <span className="font-medium text-slate-800">
                          {minuteLabel(w.openMinute)} – {minuteLabel(w.closeMinute)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <MiniMap lat={salon.lat} lng={salon.lng} category={salon.category} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
