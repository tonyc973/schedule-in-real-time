"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Surface the error in the console for debugging during development.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-rose-500">
          Eroare
        </p>
        <h1 className="mt-2 text-xl font-bold text-slate-900">
          Ceva nu a funcționat
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Ne pare rău, a apărut o problemă neașteptată. Poți încerca din nou sau
          să te întorci la hartă.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Reîncearcă
          </button>
          <Link
            href="/"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            Înapoi la hartă
          </Link>
        </div>
      </div>
    </div>
  );
}
