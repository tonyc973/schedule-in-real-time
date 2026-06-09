# Claude Code Prompt — "Programări" (Bucharest Salon Booking App)

Copy everything below this line into Claude Code.

---

Build a full-stack web application called **Programări** — a map-first booking platform for beauty services in Bucharest (saloane, frizerii, unghii, barbershops), similar to how Uber/Bolt shows nearby drivers, but showing nearby salons with real-time appointment availability.

## Tech stack (do not deviate)

- **Next.js 14+ (App Router, TypeScript)** — single repo, frontend + API routes
- **Prisma ORM + SQLite** for development (schema must be Postgres-compatible for later migration)
- **Leaflet + OpenStreetMap tiles** via `react-leaflet` for the map (no API key required)
- **Tailwind CSS** for styling, mobile-first responsive design
- **Zod** for all API input validation
- **NextAuth.js** with credentials provider (email + password) for auth
- No paid APIs, no external services requiring keys. Everything must run locally with `npm run dev`.

## Core domain model

Design the Prisma schema with these entities:

- **User** (role: CLIENT or SALON_OWNER)
- **Salon** (name, description, category: HAIR | BARBER | NAILS | BEAUTY | SPA, address, lat, lng, photos as URL strings, rating cached field, priceLevel 1–3)
- **Service** (belongs to Salon: name, durationMinutes, priceRON, optional discountPercent)
- **StaffMember** (belongs to Salon: name, specialties)
- **WorkingHours** (per salon per weekday: open/close, or closed)
- **Appointment** (client, salon, service, staffMember, startTime, endTime, status: PENDING | CONFIRMED | COMPLETED | CANCELLED)
- **Review** (client, salon, rating 1–5, comment, only allowed after a COMPLETED appointment)

## Critical business logic: availability engine

This is the heart of the app — implement it carefully and write unit tests for it:

1. Given a salon, service, and date → compute available start slots by intersecting: working hours, staff member schedules, service duration, and existing non-cancelled appointments.
2. Slots are 15-minute granularity. A slot is bookable only if the full service duration fits.
3. Booking must be **transactional with conflict detection**: two simultaneous requests for the same slot must result in exactly one success (use a unique constraint or transaction-level check, not just an application check).
4. Expose `GET /api/salons/:id/availability?serviceId=&date=` returning available slots.
5. Expose a "next available slot" computed field per salon used on the map — this powers the killer feature: **"available within the next 2 hours near me."**

## Pages & features

### Phase 1 — Discovery (build and verify this first)
- **Map home page** (`/`): full-screen Leaflet map centered on Bucharest (44.4268, 26.1025), custom markers per salon colored by category, marker popup with name, rating, price level, next available slot, and a "Vezi detalii" button.
- **Filter bar** overlaid on the map: category, max price level, minimum rating, has active discounts, and "available in next 2h" toggle. Filters update markers live via API query params.
- **List/map toggle** for mobile.
- **Salon detail page** (`/salon/[id]`): photos, services with prices/durations/discounts, staff, working hours, reviews, mini-map.

### Phase 2 — Booking
- **Booking flow** on salon page: pick service → pick staff (or "oricine") → calendar date picker → available slots grid → confirm. Show total price with discount applied.
- **Client dashboard** (`/appointments`): upcoming and past appointments, cancel button (allowed up to 2h before start).
- Auth required only at the confirm step — browsing is anonymous.

### Phase 3 — Salon owner side
- **Owner dashboard** (`/dashboard`): today's appointments timeline, confirm/cancel pending bookings, manage services (CRUD), edit working hours.
- Simple stats: bookings this week, revenue estimate, most popular service.

### Phase 4 — Polish
- Review submission after completed appointments; recompute cached salon rating.
- Empty states, loading skeletons, error toasts everywhere.
- Romanian UI language throughout (labels, buttons, dates with `ro-RO` locale).

## Seed data (mandatory)

Create `prisma/seed.ts` that generates **25 realistic salons** spread across real Bucharest neighborhoods (Dorobanți, Floreasca, Drumul Taberei, Titan, Militari, Pipera, Centrul Vechi, Cotroceni) with plausible coordinates, Romanian salon names, 3–6 services each with realistic RON prices (tuns bărbați 40–80 RON, manichiură semipermanentă 90–150 RON, coafat 100–250 RON), varied working hours, 2–4 staff members each, some active discounts, pre-existing appointments to make availability realistic, and reviews. Also seed 2 demo accounts: `client@demo.ro` / `owner@demo.ro` (password `demo1234`), where the owner owns one of the salons.

## Quality requirements

- TypeScript strict mode, no `any`.
- All API routes validate input with Zod and return typed errors.
- Unit tests (Vitest) for the availability engine covering: overlapping bookings, edge-of-closing-time slots, double-booking race, cancelled appointments freeing slots.
- A `README.md` with setup steps: `npm install`, `npx prisma migrate dev`, `npx prisma db seed`, `npm run dev`.
- After each phase, run the app, verify it works end-to-end, and fix errors before moving to the next phase.

## Working method

Work phase by phase in the order above. Start by writing the Prisma schema and the availability engine with its tests, get tests green, then build Phase 1 UI. Do not stub the availability logic — implement it fully before any booking UI exists. Commit after each completed phase with a descriptive message.
