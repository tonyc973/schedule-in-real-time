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
  "select-dark h-9 cursor-pointer rounded-full border border-stone-200 bg-white pl-3.5 pr-8 text-[12.5px] font-medium text-stone-700 shadow-sm outline-none transition hover:border-stone-300 focus:border-[#b8923f]";

const pillBase =
  "h-9 rounded-full border px-3.5 text-[12.5px] font-medium shadow-sm transition whitespace-nowrap";
const pillIdle = "border-stone-200 bg-white text-stone-600 hover:border-stone-300";

export default function FilterBar({ filters, onChange, resultCount, loading }: Props) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="flex min-w-max items-center gap-2 md:min-w-0 md:flex-wrap">
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
        className={`${pillBase} ${
          filters.discount
            ? "border-rose-300 bg-rose-50 text-rose-700"
            : pillIdle
        }`}
      >
        Reduceri
      </button>

      <button
        type="button"
        aria-pressed={filters.within2h}
        onClick={() => set("within2h", !filters.within2h)}
        className={`${pillBase} inline-flex items-center gap-1.5 ${
          filters.within2h
            ? "border-[#d9c08a] bg-[#f6ecd6] text-[#7a5d28]"
            : pillIdle
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            filters.within2h ? "animate-pulse-dot bg-[#b8923f]" : "bg-stone-400"
          }`}
        />
        Liber în 2h
      </button>

      <span className="ml-auto inline-flex h-9 items-center gap-1.5 whitespace-nowrap pl-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
        {loading ? (
          <>
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-[#b8923f]" />
            Se caută…
          </>
        ) : (
          `${resultCount} saloane`
        )}
      </span>
    </div>
  );
}
