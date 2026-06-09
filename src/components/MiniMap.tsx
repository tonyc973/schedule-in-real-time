"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CATEGORY_COLORS, type SalonCategory } from "@/lib/enums";

const GLYPH: Record<string, string> = {
  HAIR: "✂",
  BARBER: "💈",
  NAILS: "💅",
  BEAUTY: "💄",
  SPA: "🌸",
};

export default function MiniMap({
  lat,
  lng,
  category,
}: {
  lat: number;
  lng: number;
  category: SalonCategory;
}) {
  const icon = L.divIcon({
    className: "",
    html: `<div class="salon-pin" style="background:${CATEGORY_COLORS[category]}"><span>${
      GLYPH[category] ?? "📍"
    }</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      scrollWheelZoom={false}
      dragging={false}
      className="h-56 w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={icon} />
    </MapContainer>
  );
}
