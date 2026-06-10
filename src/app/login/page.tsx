"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

type Tab = "login" | "register";

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

function LoginCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [tab, setTab] = useState<Tab>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchTab(next: Tab): void {
    setTab(next);
    setError(null);
  }

  async function doSignIn(): Promise<boolean> {
    const res = await signIn("credentials", { email, password, redirect: false });
    return !!res?.ok;
  }

  function goToCallback(): void {
    router.push(callbackUrl);
    router.refresh();
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const ok = await doSignIn();
      if (ok) {
        goToCallback();
      } else {
        setError("Email sau parolă incorecte");
      }
    } catch {
      setError("A apărut o eroare. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (res.status === 201) {
        const ok = await doSignIn();
        if (ok) {
          goToCallback();
        } else {
          setError("Contul a fost creat, dar autentificarea a eșuat. Încearcă să te conectezi.");
        }
        return;
      }
      const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
      setError(body.error?.message ?? "Nu am putut crea contul.");
    } catch {
      setError("A apărut o eroare. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  }

  const tabBtn = (active: boolean): string =>
    `flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
      active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
    }`;

  const inputCls =
    "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <Link
          href="/"
          className="inline-block text-2xl font-bold tracking-tight text-slate-900"
        >
          Programări
        </Link>
        <p className="mt-1 text-sm text-slate-500">
          {tab === "login"
            ? "Conectează-te pentru a-ți gestiona rezervările."
            : "Creează un cont pentru a rezerva servicii."}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            className={tabBtn(tab === "login")}
            onClick={() => switchTab("login")}
          >
            Autentificare
          </button>
          <button
            type="button"
            className={tabBtn(tab === "register")}
            onClick={() => switchTab("register")}
          >
            Cont nou
          </button>
        </div>

        {tab === "login" ? (
          <form className="mt-4 space-y-3" onSubmit={handleLogin}>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Parolă</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                className={inputCls}
              />
            </label>
            {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Se autentifică…" : "Autentificare"}
            </button>
          </form>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={handleRegister}>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Nume</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete="name"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Parolă</span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                className={inputCls}
              />
              <span className="mt-1 block text-[11px] text-slate-400">Minim 8 caractere</span>
            </label>
            {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Se creează contul…" : "Creează cont"}
            </button>
          </form>
        )}

        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
          Cont demo: client@demo.ro / demo1234
        </p>
      </div>

      <div className="mt-5 text-center">
        <Link
          href="/"
          className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
        >
          ← Înapoi la hartă
        </Link>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <span className="text-2xl font-bold tracking-tight text-slate-900">Programări</span>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-4 space-y-3">
          <div className="h-14 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-14 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 py-10">
      <Suspense fallback={<LoginFallback />}>
        <LoginCard />
      </Suspense>
    </div>
  );
}
