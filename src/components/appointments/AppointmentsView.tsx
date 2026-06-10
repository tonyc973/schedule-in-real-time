"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AppointmentDTO } from "@/lib/dto";
import { formatLongDate, formatPrice, formatTime } from "@/lib/format";
import { CategoryBadge } from "@/components/ui";

type TabKey = "upcoming" | "past";

interface AppointmentsViewProps {
  upcoming: AppointmentDTO[];
  past: AppointmentDTO[];
}

interface StatusStyle {
  label: string;
  className: string;
}

// Romanian status labels + accent colors per the design system.
const STATUS_STYLES: Record<string, StatusStyle> = {
  PENDING: { label: "În așteptare", className: "bg-amber-100 text-amber-700" },
  CONFIRMED: { label: "Confirmată", className: "bg-emerald-100 text-emerald-700" },
  COMPLETED: { label: "Finalizată", className: "bg-slate-100 text-slate-600" },
  CANCELLED: { label: "Anulată", className: "bg-rose-100 text-rose-700" },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? {
    label: status,
    className: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${style.className}`}
    >
      {style.label}
    </span>
  );
}

interface CancelError {
  id: string;
  message: string;
}

export default function AppointmentsView({ upcoming, past }: AppointmentsViewProps) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("upcoming");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<CancelError | null>(null);

  async function handleCancel(id: string): Promise<void> {
    if (!window.confirm("Sigur anulezi această programare?")) return;
    setCancelError(null);
    setCancellingId(id);
    try {
      const res = await fetch(`/api/appointments/${id}/cancel`, { method: "POST" });
      if (res.ok) {
        router.refresh();
        return;
      }
      let message = "Programarea nu a putut fi anulată.";
      try {
        const body: unknown = await res.json();
        if (
          body &&
          typeof body === "object" &&
          "error" in body &&
          body.error &&
          typeof body.error === "object" &&
          "message" in body.error &&
          typeof (body.error as { message: unknown }).message === "string"
        ) {
          message = (body.error as { message: string }).message;
        }
      } catch {
        // keep the default message if the body is not JSON
      }
      setCancelError({ id, message });
    } catch {
      setCancelError({ id, message: "Eroare de rețea. Încearcă din nou." });
    } finally {
      setCancellingId(null);
    }
  }

  const items = tab === "upcoming" ? upcoming : past;
  const emptyMessage =
    tab === "upcoming" ? "Nu ai programări viitoare." : "Nu ai programări anterioare.";

  return (
    <div className="mt-6">
      {/* Tabs */}
      <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <TabButton
          active={tab === "upcoming"}
          onClick={() => setTab("upcoming")}
          label="Următoarele"
          count={upcoming.length}
        />
        <TabButton
          active={tab === "past"}
          onClick={() => setTab("past")}
          label="Istoric"
          count={past.length}
        />
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.map((appt) => (
            <li
              key={appt.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/salon/${appt.salon.id}`}
                      className="text-base font-semibold text-slate-900 hover:underline"
                    >
                      {appt.salon.name}
                    </Link>
                    <CategoryBadge category={appt.salon.category} />
                  </div>
                  <p className="mt-1 text-sm text-slate-700">
                    {appt.serviceName}{" "}
                    <span className="text-slate-400">cu {appt.staffName}</span>
                  </p>
                </div>
                <StatusBadge status={appt.status} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                <span className="font-medium text-slate-800">
                  {formatLongDate(appt.startUtc)}
                </span>
                <span>
                  {formatTime(appt.startUtc)}–{formatTime(appt.endUtc)}
                </span>
                <span className="font-semibold text-slate-900">
                  {formatPrice(appt.priceRON)}
                </span>
              </div>

              {/* Cancel action (only for cancellable upcoming items) */}
              {appt.canCancel ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleCancel(appt.id)}
                    disabled={cancellingId === appt.id}
                    className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cancellingId === appt.id ? "Se anulează…" : "Anulează"}
                  </button>
                  {cancelError?.id === appt.id && (
                    <p className="text-sm font-medium text-rose-600">
                      {cancelError.message}
                    </p>
                  )}
                </div>
              ) : (
                appt.cancelReason && (
                  <p className="mt-3 text-xs text-slate-400">{appt.cancelReason}</p>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
      <span
        className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
          active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
