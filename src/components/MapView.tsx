"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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
    html: `<div class="salon-pin ${soon ? "has-soon" : ""}" style="background:${color}"><span>${
      CATEGORY_GLYPH[salon.category] ?? "📍"
    }</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
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
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToHighlight salon={highlighted} />
      {salons.map((salon) => {
        const soon = !!salon.nextSlot && salon.nextSlot.inMinutes <= WITHIN_2H_MINUTES;
        return (
          <Marker key={salon.id} position={[salon.lat, salon.lng]} icon={pinIcon(salon)}>
            <Popup>
              <div className="w-52">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{salon.name}</h3>
                  <span className="text-xs text-slate-500">{priceLevelSymbol(salon.priceLevel)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: CATEGORY_COLORS[salon.category] }}
                  >
                    {CATEGORY_LABELS[salon.category]}
                  </span>
                  {salon.rating > 0 && (
                    <span>
                      <span className="text-amber-500">★</span> {salon.rating.toFixed(1)}{" "}
                      <span className="text-slate-400">({salon.reviewCount})</span>
                    </span>
                  )}
                </div>
                {salon.minPriceRON !== null && (
                  <p className="mt-1 text-xs text-slate-500">de la {formatPrice(salon.minPriceRON)}</p>
                )}
                <div className="mt-2">
                  {salon.nextSlot ? (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        soon ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      Liber {formatNextSlot(salon.nextSlot.startUtc)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Fără disponibilitate apropiată</span>
                  )}
                </div>
                <Link
                  href={`/salon/${salon.id}`}
                  className="mt-3 block rounded-lg bg-slate-900 px-3 py-1.5 text-center text-xs font-semibold text-white hover:bg-slate-700"
                >
                  Vezi detalii
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
