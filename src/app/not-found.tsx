import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-5xl font-bold tracking-tight text-emerald-600">404</p>
        <h1 className="mt-3 text-xl font-bold text-slate-900">
          Pagina nu a fost găsită
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Ne pare rău, pagina pe care o cauți nu există sau a fost mutată.
        </p>

        <div className="mt-6">
          <Link
            href="/"
            className="inline-block rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            ← Înapoi la hartă
          </Link>
        </div>
      </div>
    </div>
  );
}
