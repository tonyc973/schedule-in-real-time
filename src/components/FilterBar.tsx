"use client";

import { SALON_CATEGORIES, CATEGORY_LABELS } from "@/lib/enums";

export interface Filters {
  category: string;
  maxPrice: string;
  minRating: string;
  discount: boolean;
  within2h: boolean;
}

export const EMPTY_FILTERS: Filters = {
  category: "",
  maxPrice: "",
  minRating: "",
  discount: false,
  within2h: false,
};

interface Props {
  filters: Filters;
  onChange: (next: Filters) => void;
  resultCount: number;
  loading: boolean;
}

const selectClass =
  "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none";

export default function FilterBar({ filters, onChange, resultCount, loading }: Props) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="pointer-events-auto rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Categorie"
          className={selectClass}
          value={filters.category}
          onChange={(e) => set("category", e.target.value)}
        >
          <option value="">Toate categoriile</option>
          {SALON_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>

        <select
          aria-label="Preț maxim"
          className={selectClass}
          value={filters.maxPrice}
          onChange={(e) => set("maxPrice", e.target.value)}
        >
          <option value="">Orice preț</option>
          <option value="1">$ — accesibil</option>
          <option value="2">$$ — mediu</option>
          <option value="3">$$$ — premium</option>
        </select>

        <select
          aria-label="Rating minim"
          className={selectClass}
          value={filters.minRating}
          onChange={(e) => set("minRating", e.target.value)}
        >
          <option value="">Orice rating</option>
          <option value="3">3★ +</option>
          <option value="4">4★ +</option>
          <option value="4.5">4.5★ +</option>
        </select>

        <button
          type="button"
          aria-pressed={filters.discount}
          onClick={() => set("discount", !filters.discount)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium shadow-sm transition ${
            filters.discount
              ? "bg-rose-600 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Reduceri
        </button>

        <button
          type="button"
          aria-pressed={filters.within2h}
          onClick={() => set("within2h", !filters.within2h)}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold shadow-sm transition ${
            filters.within2h
              ? "bg-emerald-600 text-white"
              : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          ⚡ Liber în 2h
        </button>

        <span className="ml-auto pr-1 text-xs text-slate-500">
          {loading ? "Se încarcă…" : `${resultCount} saloane`}
        </span>
      </div>
    </div>
  );
}
