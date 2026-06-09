"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { SalonListItemDTO } from "@/lib/dto";
import FilterBar, { EMPTY_FILTERS, type Filters } from "./FilterBar";
import SalonCard from "./SalonCard";

// Leaflet touches `window`, so the map is client-only (no SSR).
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-sky-100 text-slate-500">
      Se încarcă harta…
    </div>
  ),
});

function buildQuery(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.minRating) params.set("minRating", filters.minRating);
  if (filters.discount) params.set("discount", "true");
  if (filters.within2h) params.set("within2h", "true");
  return params.toString();
}

export default function HomeClient() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [salons, setSalons] = useState<SalonListItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    const query = buildQuery(filters);
    fetch(`/api/salons${query ? `?${query}` : ""}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.message ?? "Eroare la încărcarea saloanelor");
        }
        return res.json();
      })
      .then((data: { salons: SalonListItemDTO[] }) => {
        setSalons(data.salons);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Eroare necunoscută");
        setLoading(false);
      });

    return () => controller.abort();
  }, [filters]);

  const onHover = useCallback((id: string | null) => setHighlightId(id), []);

  const listContent = useMemo(() => {
    if (loading && salons.length === 0) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      );
    }
    if (error) {
      return (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      );
    }
    if (salons.length === 0) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Niciun salon nu corespunde filtrelor selectate.
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {salons.map((salon) => (
          <SalonCard key={salon.id} salon={salon} onHover={onHover} />
        ))}
      </div>
    );
  }, [loading, error, salons, onHover]);

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      {/* Overlay header + filter bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] p-3">
        <div className="mx-auto max-w-5xl space-y-2">
          <div className="pointer-events-auto flex items-center gap-2">
            <span className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-bold text-white shadow">
              Programări
            </span>
            <span className="hidden text-xs text-slate-600 sm:inline">
              Saloane în București · disponibilitate live
            </span>
          </div>
          <FilterBar
            filters={filters}
            onChange={setFilters}
            resultCount={salons.length}
            loading={loading}
          />
        </div>
      </div>

      <div className="flex h-full">
        {/* List / sidebar */}
        <aside
          className={`h-full w-full overflow-y-auto bg-slate-50 px-3 pb-24 pt-36 md:w-[400px] md:border-r md:border-slate-200 ${
            viewMode === "map" ? "hidden md:block" : "block"
          }`}
        >
          {listContent}
        </aside>

        {/* Map */}
        <div
          className={`relative h-full flex-1 ${viewMode === "list" ? "hidden md:block" : "block"}`}
        >
          <MapView salons={salons} highlightId={highlightId} />
        </div>
      </div>

      {/* Mobile map/list toggle */}
      <button
        type="button"
        onClick={() => setViewMode((m) => (m === "map" ? "list" : "map"))}
        className="fixed bottom-5 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg md:hidden"
      >
        {viewMode === "map" ? "📋 Listă" : "🗺️ Hartă"}
      </button>
    </main>
  );
}
