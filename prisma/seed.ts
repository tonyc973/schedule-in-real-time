// Seed: 25 realistic Bucharest salons across real neighborhoods, with services,
// staff, working hours, discounts, pre-existing appointments and reviews, plus
// the two demo accounts. Idempotent — wipes and recreates on every run.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { localToUtc, toLocalParts } from "../src/lib/availability/time";
import type { SalonCategory } from "../src/lib/enums";

const prisma = new PrismaClient();

// --- Deterministic PRNG so reseeding gives the same plausible data -----------
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260609);
const rand = (min: number, max: number) => min + rng() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const pick = <T>(arr: T[]): T => arr[randInt(0, arr.length - 1)];
const pickSome = <T>(arr: T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(randInt(0, copy.length - 1), 1)[0]);
  return out;
};
const round5 = (n: number) => Math.round(n / 5) * 5;

// --- Reference data ----------------------------------------------------------
const HOODS: Record<string, [number, number]> = {
  Dorobanți: [44.4647, 26.0987],
  Floreasca: [44.469, 26.105],
  "Drumul Taberei": [44.418, 26.033],
  Titan: [44.415, 26.156],
  Militari: [44.435, 25.998],
  Pipera: [44.488, 26.123],
  "Centrul Vechi": [44.431, 26.101],
  Cotroceni: [44.428, 26.06],
};

const STREETS: Record<string, string[]> = {
  Dorobanți: ["Calea Dorobanți", "Strada Polonă", "Strada Roma"],
  Floreasca: ["Calea Floreasca", "Strada Glinka", "Bulevardul Mircea Eliade"],
  "Drumul Taberei": ["Drumul Taberei", "Strada Brașov", "Bulevardul Timișoara"],
  Titan: ["Bulevardul Liviu Rebreanu", "Strada Nicolae Grigorescu", "Aleea Barajul Sadului"],
  Militari: ["Bulevardul Iuliu Maniu", "Strada Apusului", "Strada Lujerului"],
  Pipera: ["Bulevardul Pipera", "Strada Alexandru Șerbănescu", "Strada Barbu Văcărescu"],
  "Centrul Vechi": ["Strada Lipscani", "Strada Smârdan", "Strada Gabroveni"],
  Cotroceni: ["Bulevardul Eroilor Sanitari", "Strada Doctor Lister", "Strada Sirenelor"],
};

interface ServiceTemplate {
  name: string;
  durationMinutes: number;
  priceRON: [number, number];
}
const SERVICE_CATALOG: Record<SalonCategory, ServiceTemplate[]> = {
  HAIR: [
    { name: "Tuns damă", durationMinutes: 45, priceRON: [60, 120] },
    { name: "Coafat", durationMinutes: 60, priceRON: [100, 250] },
    { name: "Vopsit", durationMinutes: 120, priceRON: [180, 400] },
    { name: "Tuns + spălat + uscat", durationMinutes: 60, priceRON: [80, 160] },
    { name: "Tratament keratină", durationMinutes: 90, priceRON: [250, 500] },
    { name: "Balayage", durationMinutes: 150, priceRON: [300, 600] },
  ],
  BARBER: [
    { name: "Tuns bărbați", durationMinutes: 30, priceRON: [40, 80] },
    { name: "Tuns + barbă", durationMinutes: 45, priceRON: [60, 110] },
    { name: "Aranjat barbă", durationMinutes: 30, priceRON: [30, 60] },
    { name: "Tuns copii", durationMinutes: 30, priceRON: [35, 60] },
    { name: "Bărbierit clasic", durationMinutes: 45, priceRON: [50, 90] },
  ],
  NAILS: [
    { name: "Manichiură semipermanentă", durationMinutes: 60, priceRON: [90, 150] },
    { name: "Manichiură clasică", durationMinutes: 45, priceRON: [50, 90] },
    { name: "Pedichiură", durationMinutes: 60, priceRON: [80, 140] },
    { name: "Construcție unghii", durationMinutes: 90, priceRON: [120, 220] },
    { name: "Gel pe unghia naturală", durationMinutes: 75, priceRON: [100, 170] },
  ],
  BEAUTY: [
    { name: "Pensat sprâncene", durationMinutes: 30, priceRON: [30, 60] },
    { name: "Tratament facial", durationMinutes: 60, priceRON: [120, 280] },
    { name: "Machiaj profesional", durationMinutes: 60, priceRON: [150, 350] },
    { name: "Extensii gene", durationMinutes: 90, priceRON: [120, 250] },
    { name: "Epilare cu ceară", durationMinutes: 45, priceRON: [60, 160] },
  ],
  SPA: [
    { name: "Masaj de relaxare", durationMinutes: 60, priceRON: [120, 250] },
    { name: "Masaj anticelulitic", durationMinutes: 75, priceRON: [150, 300] },
    { name: "Tratament corporal", durationMinutes: 90, priceRON: [200, 400] },
    { name: "Aromaterapie", durationMinutes: 60, priceRON: [140, 280] },
    { name: "Reflexoterapie", durationMinutes: 45, priceRON: [100, 200] },
  ],
};

const STAFF_NAMES = [
  "Andreea", "Maria", "Elena", "Ioana", "Cristina", "Gabriela", "Alexandra", "Daniela",
  "Mihai", "Andrei", "Cătălin", "George", "Robert", "Ștefan", "Vlad", "Bogdan",
  "Raluca", "Bianca", "Diana", "Roxana",
];
const SPECIALTIES: Record<SalonCategory, string[]> = {
  HAIR: ["tuns", "coafat", "vopsit", "balayage", "tratamente"],
  BARBER: ["tuns clasic", "fade", "barbă", "bărbierit"],
  NAILS: ["semipermanentă", "construcție", "nail art", "pedichiură"],
  BEAUTY: ["machiaj", "gene", "sprâncene", "facial"],
  SPA: ["masaj", "anticelulitic", "aromaterapie", "reflexoterapie"],
};

const REVIEW_COMMENTS = [
  "Servicii excelente, recomand cu încredere!",
  "Personal foarte amabil și profesionist.",
  "Am plecat foarte mulțumită, revin sigur.",
  "Curat, modern și punctual. Felicitări!",
  "Raport calitate-preț foarte bun.",
  "Atmosferă plăcută și rezultat impecabil.",
  "Programare ușoară și fără timpi de așteptare.",
  "Cea mai bună experiență din zonă.",
];

interface SalonSpec {
  name: string;
  hood: keyof typeof HOODS;
  category: SalonCategory;
  priceLevel: number;
}
const SALONS: SalonSpec[] = [
  { name: "Studio Bellezza", hood: "Dorobanți", category: "HAIR", priceLevel: 3 },
  { name: "Frizeria Centrală", hood: "Centrul Vechi", category: "BARBER", priceLevel: 2 },
  { name: "Nails by Ana", hood: "Floreasca", category: "NAILS", priceLevel: 2 },
  { name: "Glamour Beauty Lounge", hood: "Pipera", category: "BEAUTY", priceLevel: 3 },
  { name: "Spa Serenity", hood: "Floreasca", category: "SPA", priceLevel: 3 },
  { name: "Coafor Eleganza", hood: "Dorobanți", category: "HAIR", priceLevel: 2 },
  { name: "Barber Bros", hood: "Militari", category: "BARBER", priceLevel: 1 },
  { name: "Pink Nails Studio", hood: "Titan", category: "NAILS", priceLevel: 1 },
  { name: "La Coafeur", hood: "Cotroceni", category: "HAIR", priceLevel: 2 },
  { name: "Gentlemen's Barbershop", hood: "Centrul Vechi", category: "BARBER", priceLevel: 3 },
  { name: "Unghii Perfecte", hood: "Drumul Taberei", category: "NAILS", priceLevel: 1 },
  { name: "Beauty Room", hood: "Dorobanți", category: "BEAUTY", priceLevel: 2 },
  { name: "Relax Spa Center", hood: "Pipera", category: "SPA", priceLevel: 2 },
  { name: "Salon Aristocrat", hood: "Cotroceni", category: "HAIR", priceLevel: 3 },
  { name: "Old Town Barber", hood: "Centrul Vechi", category: "BARBER", priceLevel: 2 },
  { name: "Nail Art Boutique", hood: "Floreasca", category: "NAILS", priceLevel: 3 },
  { name: "Coafor Diana", hood: "Militari", category: "HAIR", priceLevel: 1 },
  { name: "The Beard District", hood: "Titan", category: "BARBER", priceLevel: 2 },
  { name: "Lash & Brow Bar", hood: "Dorobanți", category: "BEAUTY", priceLevel: 2 },
  { name: "Zen Massage Studio", hood: "Floreasca", category: "SPA", priceLevel: 2 },
  { name: "Tunsori Moderne", hood: "Drumul Taberei", category: "HAIR", priceLevel: 1 },
  { name: "Barbershop No.5", hood: "Pipera", category: "BARBER", priceLevel: 2 },
  { name: "Manichiura Chic", hood: "Centrul Vechi", category: "NAILS", priceLevel: 2 },
  { name: "Glow Skin Clinic", hood: "Cotroceni", category: "BEAUTY", priceLevel: 3 },
  { name: "Aroma Spa & Wellness", hood: "Pipera", category: "SPA", priceLevel: 3 },
];

const DESCRIPTIONS: Record<SalonCategory, string> = {
  HAIR: "Salon de coafură cu stiliști experimentați și produse premium.",
  BARBER: "Frizerie pentru domni, în stil clasic și modern.",
  NAILS: "Studio de unghii cu tehnicieni certificați și design personalizat.",
  BEAUTY: "Salon de înfrumusețare: machiaj, gene, sprâncene și tratamente faciale.",
  SPA: "Centru spa & wellness pentru relaxare și răsfăț.",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Working hours: returns 7 rows (weekday 0..6). Some salons closed Sunday/Monday.
function buildWorkingHours(category: SalonCategory): {
  weekday: number;
  openMinute: number;
  closeMinute: number;
  closed: boolean;
}[] {
  const open = pick([8 * 60, 9 * 60, 10 * 60]);
  const close = pick([19 * 60, 20 * 60, 21 * 60]);
  const closedSunday = rng() < 0.6;
  const closedMonday = category === "BARBER" && rng() < 0.3;
  return Array.from({ length: 7 }, (_, weekday) => {
    let closed = false;
    let dayOpen = open;
    let dayClose = close;
    if (weekday === 0 && closedSunday) closed = true;
    if (weekday === 1 && closedMonday) closed = true;
    if (weekday === 6) dayClose = pick([17 * 60, 18 * 60]); // shorter Saturdays
    if (weekday === 0 && !closed) {
      dayOpen = 10 * 60;
      dayClose = 16 * 60;
    }
    return { weekday, openMinute: dayOpen, closeMinute: dayClose, closed };
  });
}

// Resolve the upcoming/previous calendar date at `offsetDays` from now, in local time.
function localDateAtOffset(now: Date, offsetDays: number) {
  const noon = new Date(
    localToUtc(toLocalParts(now).year, toLocalParts(now).month, toLocalParts(now).day, 12 * 60).getTime() +
      offsetDays * 24 * 60 * 60 * 1000,
  );
  const p = toLocalParts(noon);
  return { year: p.year, month: p.month, day: p.day, weekday: p.weekday };
}

async function main() {
  console.log("🌱 Seeding…");
  // Wipe in dependency order.
  await prisma.review.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.workingHours.deleteMany();
  await prisma.staffMember.deleteMany();
  await prisma.service.deleteMany();
  await prisma.salon.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const client = await prisma.user.create({
    data: { email: "client@demo.ro", name: "Client Demo", passwordHash, role: "CLIENT" },
  });
  const owner = await prisma.user.create({
    data: { email: "owner@demo.ro", name: "Owner Demo", passwordHash, role: "SALON_OWNER" },
  });
  // A few extra clients so appointments/reviews aren't all from one account.
  const extraClients = await Promise.all(
    ["ana", "ioana", "vlad", "andrei", "maria"].map((n, i) =>
      prisma.user.create({
        data: {
          email: `${n}${i}@demo.ro`,
          name: n[0].toUpperCase() + n.slice(1),
          passwordHash,
          role: "CLIENT",
        },
      }),
    ),
  );
  const allClients = [client, ...extraClients];

  const now = new Date();
  let totalAppointments = 0;
  let totalReviews = 0;

  for (let idx = 0; idx < SALONS.length; idx++) {
    const spec = SALONS[idx];
    const [baseLat, baseLng] = HOODS[spec.hood];
    const slug = slugify(spec.name);
    const street = pick(STREETS[spec.hood]);
    const photos = [1, 2, 3].map(
      (n) => `https://picsum.photos/seed/${slug}-${n}/800/600`,
    );

    const salon = await prisma.salon.create({
      data: {
        name: spec.name,
        description: DESCRIPTIONS[spec.category],
        category: spec.category,
        address: `${street} nr. ${randInt(1, 180)}, ${spec.hood}, București`,
        lat: baseLat + rand(-0.004, 0.004),
        lng: baseLng + rand(-0.004, 0.004),
        photos: JSON.stringify(photos),
        priceLevel: spec.priceLevel,
        rating: 0,
        reviewCount: 0,
        ownerId: idx === 0 ? owner.id : null,
      },
    });

    // Services (3–6), some discounted.
    const serviceTemplates = pickSome(SERVICE_CATALOG[spec.category], randInt(3, Math.min(6, SERVICE_CATALOG[spec.category].length)));
    const services = await Promise.all(
      serviceTemplates.map((t) => {
        const price = round5(rand(t.priceRON[0], t.priceRON[1]) * (0.85 + 0.3 * spec.priceLevel) * 0.6 + t.priceRON[0] * 0.4);
        const hasDiscount = rng() < 0.3;
        return prisma.service.create({
          data: {
            salonId: salon.id,
            name: t.name,
            durationMinutes: t.durationMinutes,
            priceRON: Math.max(t.priceRON[0], Math.min(t.priceRON[1], price)),
            discountPercent: hasDiscount ? pick([10, 15, 20, 25]) : null,
          },
        });
      }),
    );

    // Staff (2–4).
    const staffCount = randInt(2, 4);
    const staffNames = pickSome(STAFF_NAMES, staffCount);
    const staff = await Promise.all(
      staffNames.map((name) =>
        prisma.staffMember.create({
          data: {
            salonId: salon.id,
            name,
            specialties: JSON.stringify(pickSome(SPECIALTIES[spec.category], randInt(1, 3))),
          },
        }),
      ),
    );

    // Working hours.
    const wh = buildWorkingHours(spec.category);
    await prisma.workingHours.createMany({
      data: wh.map((w) => ({ ...w, salonId: salon.id })),
    });

    // Pre-existing future appointments (PENDING/CONFIRMED) to make availability realistic.
    const usedKeys = new Set<string>(); // staffId@isoStart
    const futureCount = randInt(2, 5);
    for (let a = 0; a < futureCount; a++) {
      const offset = randInt(0, 5);
      const date = localDateAtOffset(now, offset);
      const day = wh.find((w) => w.weekday === date.weekday);
      if (!day || day.closed) continue;
      const service = pick(services);
      const member = pick(staff);
      // aligned-to-15 start that fits before close
      const latestStart = day.closeMinute - service.durationMinutes;
      if (latestStart <= day.openMinute) continue;
      const startMinute = round5(rand(day.openMinute, latestStart) / 5) * 5;
      const aligned = Math.round(startMinute / 15) * 15;
      const startUtc = localToUtc(date.year, date.month, date.day, aligned);
      if (offset === 0 && startUtc.getTime() <= now.getTime()) continue;
      const key = `${member.id}@${startUtc.toISOString()}`;
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      const endUtc = new Date(startUtc.getTime() + service.durationMinutes * 60000);
      await prisma.appointment.create({
        data: {
          clientId: pick(allClients).id,
          salonId: salon.id,
          serviceId: service.id,
          staffMemberId: member.id,
          startTime: startUtc,
          endTime: endUtc,
          status: rng() < 0.5 ? "CONFIRMED" : "PENDING",
        },
      });
      totalAppointments++;
    }

    // Past COMPLETED appointments + reviews.
    const reviewCount = randInt(2, 6);
    const ratings: number[] = [];
    for (let r = 0; r < reviewCount; r++) {
      const offset = -randInt(2, 25);
      const date = localDateAtOffset(now, offset);
      const day = wh.find((w) => w.weekday === date.weekday);
      if (!day || day.closed) continue;
      const service = pick(services);
      const member = pick(staff);
      const latestStart = day.closeMinute - service.durationMinutes;
      if (latestStart <= day.openMinute) continue;
      const aligned = Math.round((round5(rand(day.openMinute, latestStart) / 5) * 5) / 15) * 15;
      const startUtc = localToUtc(date.year, date.month, date.day, aligned);
      const key = `${member.id}@${startUtc.toISOString()}`;
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      const endUtc = new Date(startUtc.getTime() + service.durationMinutes * 60000);
      const reviewer = pick(allClients);
      const appt = await prisma.appointment.create({
        data: {
          clientId: reviewer.id,
          salonId: salon.id,
          serviceId: service.id,
          staffMemberId: member.id,
          startTime: startUtc,
          endTime: endUtc,
          status: "COMPLETED",
        },
      });
      totalAppointments++;
      const rating = randInt(3, 5);
      ratings.push(rating);
      await prisma.review.create({
        data: {
          clientId: reviewer.id,
          salonId: salon.id,
          appointmentId: appt.id,
          rating,
          comment: pick(REVIEW_COMMENTS),
        },
      });
      totalReviews++;
    }

    // Cache rating.
    if (ratings.length) {
      const avg = ratings.reduce((s, n) => s + n, 0) / ratings.length;
      await prisma.salon.update({
        where: { id: salon.id },
        data: { rating: Math.round(avg * 10) / 10, reviewCount: ratings.length },
      });
    }
  }

  console.log(
    `✅ Seeded ${SALONS.length} salons, ${allClients.length + 1} users, ${totalAppointments} appointments, ${totalReviews} reviews.`,
  );
  console.log("   Demo accounts: client@demo.ro / owner@demo.ro (parolă: demo1234)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
