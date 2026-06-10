"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import type { SalonListItemDTO } from "@/lib/dto";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/enums";
import { BUCHAREST_CENTER, DEFAULT_ZOOM, WITHIN_2H_MINUTES } from "@/lib/constants";
import { formatNextSlot, formatPrice, priceLevelSymbol } from "@/lib/format";

const CATEGORY_GLYPH: Record<string, string> = {
  HAIR: "✂",
  BARBER: "💈",
  NAILS: "💅",
  BEAUTY: "💄",
  SPA: "🌸",
};

function pinIcon(salon: SalonListItemDTO): L.DivIcon {
  const soon = !!salon.nextSlot && salon.nextSlot.inMinutes <= WITHIN_2H_MINUTES;
  const color = CATEGORY_COLORS[salon.category];
  return L.divIcon({
    className: "",
    html: `<div class="salon-marker ${soon ? "is-soon" : ""}" style="--cat:${color}"><span class="salon-marker__glyph">${
      CATEGORY_GLYPH[salon.category] ?? "📍"
    }</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  });
}

// Keeps the map in sync when the highlighted salon changes (fly to it).
function FlyToHighlight({ salon }: { salon: SalonListItemDTO | null }) {
  const map = useMap();
  useEffect(() => {
    if (salon) map.flyTo([salon.lat, salon.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [salon, map]);
  return null;
}

interface Props {
  salons: SalonListItemDTO[];
  highlightId: string | null;
}

export default function MapView({ salons, highlightId }: Props) {
  const highlighted = useMemo(
    () => salons.find((s) => s.id === highlightId) ?? null,
    [salons, highlightId],
  );

  return (
    <MapContainer
      center={BUCHAREST_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
    >
      {/* Dark basemap (CARTO Dark Matter) — free tiles, no API key. */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      <ZoomControl position="bottomright" />
      <FlyToHighlight salon={highlighted} />
      {salons.map((salon) => {
        const soon = !!salon.nextSlot && salon.nextSlot.inMinutes <= WITHIN_2H_MINUTES;
        return (
          <Marker key={salon.id} position={[salon.lat, salon.lng]} icon={pinIcon(salon)}>
            <Popup className="salon-popup">
              <div className="w-[250px] font-sans">
                {salon.photo && (
                  <div className="relative h-24 w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={salon.photo}
                      alt={salon.name}
                      className="h-24 w-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#14110f] via-transparent to-transparent" />
                    <span
                      className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-200 backdrop-blur"
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[salon.category] }}
                      />
                      {CATEGORY_LABELS[salon.category]}
                    </span>
                  </div>
                )}
                <div className="p-3.5 pt-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-[17px] font-semibold leading-snug text-stone-50">
                      {salon.name}
                    </h3>
                    <span className="mt-0.5 text-[11px] font-medium text-stone-500">
                      {priceLevelSymbol(salon.priceLevel)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[12px]">
                    {salon.rating > 0 ? (
                      <span className="text-stone-300">
                        <span className="text-[#e8c97d]">★</span>{" "}
                        <span className="font-semibold">{salon.rating.toFixed(1)}</span>{" "}
                        <span className="text-stone-500">({salon.reviewCount})</span>
                      </span>
                    ) : (
                      <span className="text-stone-500">Fără recenzii</span>
                    )}
                    {salon.minPriceRON !== null && (
                      <span className="text-stone-500">· de la {formatPrice(salon.minPriceRON)}</span>
                    )}
                  </div>
                  <div className="mt-2.5">
                    {salon.nextSlot ? (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          soon
                            ? "border border-[#e8c97d]/30 bg-[#e8c97d]/15 text-[#ecd9a8]"
                            : "border border-white/10 bg-white/5 text-stone-400"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            soon ? "animate-pulse-dot bg-[#e8c97d]" : "bg-stone-500"
                          }`}
                        />
                        Liber {formatNextSlot(salon.nextSlot.startUtc)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-stone-500">
                        Fără disponibilitate apropiată
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/salon/${salon.id}`}
                    className="mt-3 block rounded-xl bg-[#e8c97d] px-3 py-2 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-[#1a160f] transition hover:bg-[#f0d99a]"
                  >
                    Vezi detalii
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
