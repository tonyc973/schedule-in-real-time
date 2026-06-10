import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { listUserAppointments } from "@/lib/appointments";
import AppointmentsView from "@/components/appointments/AppointmentsView";

// Auth-only dashboard: list the signed-in user's upcoming and past appointments.
export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/appointments");
  }

  const data = await listUserAppointments(session.user.id);

  return (
    <div className="min-h-[100dvh] bg-slate-50 pb-16">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
            Programări
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Hartă
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4">
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Programările mele</h1>
        <AppointmentsView upcoming={data.upcoming} past={data.past} />
      </main>
    </div>
  );
}
