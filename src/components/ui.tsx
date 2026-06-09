import { CATEGORY_COLORS, CATEGORY_LABELS, type SalonCategory } from "@/lib/enums";
import { priceLevelSymbol } from "@/lib/format";

export function CategoryBadge({ category }: { category: SalonCategory }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: CATEGORY_COLORS[category] }}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}

export function RatingStars({ rating, count }: { rating: number; count?: number }) {
  if (!rating) {
    return <span className="text-xs text-slate-400">Fără recenzii</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-600">
      <span className="text-amber-500">★</span>
      <span className="font-semibold">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-slate-400">({count})</span>}
    </span>
  );
}

export function PriceLevel({ level }: { level: number }) {
  return (
    <span className="text-xs font-medium text-slate-500" title={`Nivel preț ${level}/3`}>
      <span className="text-slate-700">{priceLevelSymbol(level)}</span>
      <span className="text-slate-300">{"$".repeat(3 - Math.min(3, level))}</span>
    </span>
  );
}

export function DiscountBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
      Reduceri active
    </span>
  );
}

export function NextSlotBadge({ label, soon }: { label: string; soon: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        soon ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${soon ? "bg-emerald-500" : "bg-slate-400"}`} />
      {label}
    </span>
  );
}
