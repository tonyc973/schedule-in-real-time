"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function TopNav() {
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-[1000] border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          className="font-display text-xl font-semibold italic tracking-tight text-slate-900"
        >
          Lumé<span className="not-italic text-[#b8923f]">.</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          {status === "loading" ? (
            <div
              className="h-8 w-28 animate-pulse rounded-lg bg-slate-100"
              aria-hidden="true"
            />
          ) : status === "authenticated" && session?.user ? (
            <>
              <Link
                href="/appointments"
                className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                Programările mele
              </Link>
              <span className="hidden text-sm font-medium text-slate-900 sm:inline">
                {session.user.name ?? session.user.email ?? "Cont"}
              </span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                Ieși
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Autentificare
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
