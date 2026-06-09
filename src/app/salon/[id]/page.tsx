import { notFound } from "next/navigation";
import { getSalonDetail } from "@/lib/salons";
import SalonDetail from "@/components/SalonDetail";

export const dynamic = "force-dynamic";

export default async function SalonPage({ params }: { params: { id: string } }) {
  const salon = await getSalonDetail(params.id);
  if (!salon) notFound();
  return <SalonDetail salon={salon} />;
}
