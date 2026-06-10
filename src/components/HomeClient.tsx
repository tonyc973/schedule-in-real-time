"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import type { SalonListItemDTO } from "@/lib/dto";
import FilterBar, { EMPTY_FILTERS, type Filters } from "./FilterBar";
import SalonCard from "./SalonCard";

// Compact account control shown in the panel / mobile header.
function AccountControl() {
  const { data: session, status } = useSession();
  if (status === "loading") {
    return <span className="skeleton h-8 w-24 rounded-full" />;
  }
  if (session?.user) {
    return (
      <div className="flex items-center gap-1.5">
        <Link
          href="/appointments"
          className="rounded-full border border-[#d9c08a] bg-[#f6ecd6] px-3 py-1.5 text-[11px] font-semibold text-[#7a5d28] transition hover:bg-[#f0e2c2]"
        >
          Programările mele
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-medium text-stone-500 transition hover:text-stone-800"
        >
          Ieși
        </button>
      </div>
    );
  }
  return (
    <Link
      href="/login"
      className="rounded-full bg-stone-900 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#f3e3b8] transition hover:bg-stone-800"
    >
      Intră în cont
    </Link>
  );
}

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <h1
        className={`font-display font-semibold italic tracking-tight text-stone-900 ${
          compact ? "text-[19px]" : "text-[26px] leading-none"
        }`}
      >
        Programări<span className="not-italic text-[#b8923f]">.</span>
      </h1>
      {!compact && (
        <p className="mt-1.5 text-[9.5px] font-bold uppercase tracking-[0.24em] text-stone-400">
          Saloane în București · live
        </p>
      )}
    </div>
  );
}

// Leaflet touches `window`, so the map is client-only (no SSR).
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-[#eceae4]">
      <div className="flex items-center gap-2.5 text-stone-500">
        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-[#b8923f]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">
          Se încarcă harta…
        </span>
      </div>
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
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-[104px] rounded-2xl" />
          ))}
        </div>
      );
    }
    if (error) {
      return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      );
    }
    if (salons.length === 0) {
      return (
        <div className="rounded-2xl border border-stone-200 bg-white px-5 py-8 text-center shadow-sm">
          <p className="font-display text-lg italic text-stone-700">Niciun rezultat</p>
          <p className="mt-1.5 text-xs text-stone-400">
            Niciun salon nu corespunde filtrelor selectate.
          </p>
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="mt-4 rounded-full border border-[#d9c08a] bg-[#f6ecd6] px-4 py-1.5 text-[11px] font-semibold text-[#7a5d28] transition hover:bg-[#f0e2c2]"
          >
            Resetează filtrele
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-2.5">
        {salons.map((salon, i) => (
          <div
            key={salon.id}
            className="animate-card-in"
            style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
          >
            <SalonCard salon={salon} onHover={onHover} />
          </div>
        ))}
      </div>
    );
  }, [loading, error, salons, onHover]);

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-[#faf8f4] font-sans">
      {/* Full-bleed map */}
      <div className="absolute inset-0 z-0">
        <MapView salons={salons} highlightId={highlightId} />
      </div>

      {/* Desktop: floating panel */}
      <div className="animate-panel-in absolute bottom-4 left-4 top-4 z-[1000] hidden w-[404px] md:flex">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-stone-900/[0.08] bg-white/[0.88] shadow-[0_24px_64px_-20px_rgba(28,25,23,0.35)] backdrop-blur-xl">
          <header className="flex items-start justify-between gap-3 px-5 pb-4 pt-5">
            <Wordmark />
            <AccountControl />
          </header>
          <div className="border-y border-stone-900/[0.06] bg-white/40 px-5 py-3.5">
            <FilterBar
              filters={filters}
              onChange={setFilters}
              resultCount={salons.length}
              loading={loading}
            />
          </div>
          <div className="panel-scroll min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5">
            {listContent}
          </div>
        </div>
      </div>

      {/* Mobile: header + filter strip */}
      <div className="animate-drop-in absolute inset-x-0 top-0 z-[1000] flex flex-col gap-2 p-3 md:hidden">
        <div className="flex items-center justify-between rounded-2xl border border-stone-900/[0.08] bg-white/[0.92] px-4 py-2.5 shadow-lg backdrop-blur-xl">
          <Wordmark compact />
          <AccountControl />
        </div>
        <div className="overflow-x-auto rounded-2xl border border-stone-900/[0.08] bg-white/[0.92] px-3 py-2.5 shadow-lg backdrop-blur-xl [scrollbar-width:none]">
          <FilterBar
            filters={filters}
            onChange={setFilters}
            resultCount={salons.length}
            loading={loading}
          />
        </div>
      </div>

      {/* Mobile: results sheet */}
      {viewMode === "list" && (
        <div className="absolute inset-x-0 bottom-0 top-[124px] z-[999] md:hidden">
          <div className="panel-scroll h-full overflow-y-auto rounded-t-3xl border-t border-stone-900/[0.1] bg-[#faf8f4]/[0.97] px-3.5 pb-28 pt-4 backdrop-blur-xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-900/15" />
            {listContent}
          </div>
        </div>
      )}

      {/* Mobile map/list toggle */}
      <button
        type="button"
        onClick={() => setViewMode((m) => (m === "map" ? "list" : "map"))}
        className="fixed bottom-5 left-1/2 z-[1001] -translate-x-1/2 rounded-full bg-stone-900 px-6 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[#f3e3b8] shadow-[0_12px_36px_rgba(28,25,23,0.4)] transition hover:bg-stone-800 md:hidden"
      >
        {viewMode === "map" ? "Listă" : "Hartă"}
      </button>
    </main>
  );
}
