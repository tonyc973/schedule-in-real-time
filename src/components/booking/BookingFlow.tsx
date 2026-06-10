"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ServiceDTO, SalonDetailDTO, StaffDTO } from "@/lib/dto";
import { formatDuration, formatLongDate, formatPrice, localDateString } from "@/lib/format";
import { useToast } from "@/components/Toast";
import AuthDialog from "./AuthDialog";

interface BookingFlowProps {
  salon: SalonDetailDTO;
}

interface Slot {
  startUtc: string;
  label: string;
  freeStaffIds: string[];
}

interface AvailabilityResponse {
  date: string;
  serviceId: string;
  durationMinutes: number;
  slots: Slot[];
}

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

const ANYONE_ID = "__anyone__";
const DAYS_AHEAD = 14;

const RO_WEEKDAY_ABBR = ["Dum", "Lun", "Mar", "Mie", "Joi", "Vin", "Sâm"];

// Weekday + day-number derived in Europe/Bucharest so the strip's label always
// describes the same calendar day as the YYYY-MM-DD that localDateString sends to
// the availability API — regardless of the visitor's device timezone.
const BUCHAREST_TZ = "Europe/Bucharest";
const bucharestWeekdayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: BUCHAREST_TZ,
  weekday: "short",
});
const bucharestDayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: BUCHAREST_TZ,
  day: "numeric",
});
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

interface DayOption {
  ymd: string;
  weekday: string;
  dayNumber: number;
}

function buildDays(): DayOption[] {
  const days: DayOption[] = [];
  const now = Date.now();
  for (let offset = 0; offset < DAYS_AHEAD; offset++) {
    const d = new Date(now + offset * 24 * 60 * 60 * 1000);
    const idx = WEEKDAY_INDEX[bucharestWeekdayFmt.format(d)] ?? 0;
    days.push({
      ymd: localDateString(d),
      weekday: RO_WEEKDAY_ABBR[idx],
      dayNumber: Number(bucharestDayFmt.format(d)),
    });
  }
  return days;
}

export default function BookingFlow({ salon }: BookingFlowProps) {
  const router = useRouter();
  const { status } = useSession();
  const { show } = useToast();

  const days = useMemo(() => buildDays(), []);

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffChoice, setStaffChoice] = useState<string>(ANYONE_ID);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  // Monotonic id so an out-of-order availability response cannot overwrite a newer one.
  const reqIdRef = useRef(0);

  const selectedService: ServiceDTO | null = useMemo(
    () => salon.services.find((s) => s.id === serviceId) ?? null,
    [salon.services, serviceId],
  );
  const selectedStaff: StaffDTO | null = useMemo(
    () => (staffChoice === ANYONE_ID ? null : salon.staff.find((m) => m.id === staffChoice) ?? null),
    [salon.staff, staffChoice],
  );

  const fetchSlots = useCallback(async () => {
    if (!serviceId || !date) return;
    const reqId = ++reqIdRef.current;
    const isStale = () => reqId !== reqIdRef.current;
    setLoadingSlots(true);
    setSlotsError(null);
    setSelectedSlot(null);
    try {
      const url = `/api/salons/${salon.id}/availability?serviceId=${encodeURIComponent(
        serviceId,
      )}&date=${encodeURIComponent(date)}`;
      const res = await fetch(url);
      if (isStale()) return; // a newer request superseded this one
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
        if (isStale()) return;
        setSlots([]);
        setSlotsError(body.error?.message ?? "Nu am putut încărca intervalele.");
        return;
      }
      const data = (await res.json()) as AvailabilityResponse;
      if (isStale()) return;
      setSlots(data.slots);
    } catch {
      if (isStale()) return;
      setSlots([]);
      setSlotsError("Nu am putut încărca intervalele.");
    } finally {
      if (!isStale()) setLoadingSlots(false);
    }
  }, [salon.id, serviceId, date]);

  useEffect(() => {
    if (serviceId && date) {
      void fetchSlots();
    } else {
      setSlots([]);
      setSelectedSlot(null);
    }
  }, [serviceId, date, fetchSlots]);

  // Slots visible given the chosen specialist.
  const visibleSlots = useMemo(() => {
    if (staffChoice === ANYONE_ID) return slots;
    return slots.filter((s) => s.freeStaffIds.includes(staffChoice));
  }, [slots, staffChoice]);

  // If the chosen specialist no longer covers the selected slot, drop it and say so.
  useEffect(() => {
    if (selectedSlot && !visibleSlots.some((s) => s.startUtc === selectedSlot.startUtc)) {
      setSelectedSlot(null);
      show("Specialistul ales nu este liber la ora selectată — alege alt interval.", "info");
    }
  }, [visibleSlots, selectedSlot, show]);

  function handleSelectService(id: string): void {
    setServiceId(id);
    setSelectedSlot(null);
  }

  const submitBooking = useCallback(async () => {
    if (!selectedService || !selectedSlot) return;
    setSubmitting(true);
    try {
      const body: {
        salonId: string;
        serviceId: string;
        startUtc: string;
        staffMemberId?: string;
      } = {
        salonId: salon.id,
        serviceId: selectedService.id,
        startUtc: selectedSlot.startUtc,
      };
      if (staffChoice !== ANYONE_ID) {
        body.staffMemberId = staffChoice;
      }

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 201) {
        show("Programare confirmată!", "success");
        router.push("/appointments");
        return;
      }

      if (res.status === 401) {
        setAuthOpen(true);
        return;
      }

      const errBody = (await res.json().catch(() => ({}))) as ApiErrorBody;
      if (res.status === 409) {
        show(errBody.error?.message ?? "Acest interval tocmai a fost ocupat.", "error");
        await fetchSlots();
        return;
      }
      show(errBody.error?.message ?? "Nu am putut finaliza rezervarea.", "error");
    } catch {
      show("Nu am putut finaliza rezervarea.", "error");
    } finally {
      setSubmitting(false);
    }
  }, [salon.id, selectedService, selectedSlot, staffChoice, show, router, fetchSlots]);

  function handleConfirm(): void {
    if (status !== "authenticated") {
      setAuthOpen(true);
      return;
    }
    void submitBooking();
  }

  function handleAuthenticated(): void {
    setAuthOpen(false);
    void submitBooking();
  }

  const stepNumber = (active: boolean): string =>
    `flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold ${
      active ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
    }`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Rezervă o programare</h2>

      {/* Step a: Service */}
      <section className="mt-4">
        <div className="flex items-center gap-2">
          <span className={stepNumber(true)}>1</span>
          <h3 className="text-sm font-semibold text-slate-800">Serviciu</h3>
        </div>
        <ul className="mt-3 space-y-2">
          {salon.services.map((s) => {
            const active = s.id === serviceId;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => handleSelectService(s.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <p className="font-medium text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-500">{formatDuration(s.durationMinutes)}</p>
                  </div>
                  <div className="text-right">
                    {s.discountPercent ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 line-through">
                          {formatPrice(s.priceRON)}
                        </span>
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                          -{s.discountPercent}%
                        </span>
                        <span className="font-semibold text-slate-900">
                          {formatPrice(s.finalPriceRON)}
                        </span>
                      </div>
                    ) : (
                      <span className="font-semibold text-slate-900">{formatPrice(s.priceRON)}</span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Step b: Specialist */}
      <section className="mt-6">
        <div className="flex items-center gap-2">
          <span className={stepNumber(!!serviceId)}>2</span>
          <h3 className="text-sm font-semibold text-slate-800">Specialist</h3>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStaffChoice(ANYONE_ID)}
            className={`rounded-xl border px-4 py-2 text-left transition ${
              staffChoice === ANYONE_ID
                ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <span className="text-sm font-medium text-slate-800">Oricine</span>
          </button>
          {salon.staff.map((m) => {
            const active = staffChoice === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setStaffChoice(m.id)}
                className={`rounded-xl border px-4 py-2 text-left transition ${
                  active
                    ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="block text-sm font-medium text-slate-800">{m.name}</span>
                {m.specialties.length > 0 && (
                  <span className="block text-xs text-slate-500">{m.specialties.join(", ")}</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Step c: Date */}
      <section className="mt-6">
        <div className="flex items-center gap-2">
          <span className={stepNumber(!!serviceId)}>3</span>
          <h3 className="text-sm font-semibold text-slate-800">Dată</h3>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {days.map((d) => {
            const active = d.ymd === date;
            return (
              <button
                key={d.ymd}
                type="button"
                onClick={() => setDate(d.ymd)}
                className={`flex w-16 flex-none flex-col items-center rounded-xl border px-2 py-2 transition ${
                  active
                    ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="text-xs font-medium uppercase text-slate-500">{d.weekday}</span>
                <span className="mt-0.5 text-lg font-bold text-slate-900">{d.dayNumber}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step d: Slots */}
      {serviceId && date && (
        <section className="mt-6">
          <div className="flex items-center gap-2">
            <span className={stepNumber(true)}>4</span>
            <h3 className="text-sm font-semibold text-slate-800">Interval orar</h3>
          </div>
          <div className="mt-3">
            {loadingSlots ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : slotsError ? (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{slotsError}</p>
            ) : visibleSlots.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                {staffChoice !== ANYONE_ID && slots.length > 0
                  ? "Specialistul ales nu are intervale libere în această zi."
                  : "Niciun interval liber în această zi."}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {visibleSlots.map((s) => {
                  const active = selectedSlot?.startUtc === s.startUtc;
                  return (
                    <button
                      key={s.startUtc}
                      type="button"
                      onClick={() => setSelectedSlot(s)}
                      className={`rounded-lg border px-2 py-2 text-sm font-medium transition ${
                        active
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-200 text-slate-700 hover:border-emerald-400 hover:text-emerald-700"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Step e: Summary + confirm */}
      {selectedService && selectedSlot && date && (
        <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <h3 className="text-sm font-semibold text-slate-800">Rezumat</h3>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Serviciu</dt>
              <dd className="text-right font-medium text-slate-800">{selectedService.name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Specialist</dt>
              <dd className="text-right font-medium text-slate-800">
                {selectedStaff ? selectedStaff.name : "Oricine"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Data și ora</dt>
              <dd className="text-right font-medium text-slate-800">
                {formatLongDate(selectedSlot.startUtc)}, {selectedSlot.label}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-emerald-200 pt-2">
              <dt className="font-semibold text-slate-700">Total</dt>
              <dd className="text-right font-bold text-slate-900">
                {formatPrice(selectedService.finalPriceRON)}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Se confirmă…" : "Confirmă rezervarea"}
          </button>
        </section>
      )}

      <AuthDialog
        open={authOpen}
        onClose={() => {
          setAuthOpen(false);
          // The dialog only ever opens to finish a booking; if it's dismissed
          // without authenticating, tell the user the booking is still pending.
          if (status !== "authenticated") {
            show("Autentifică-te pentru a finaliza rezervarea.", "info");
          }
        }}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
}
