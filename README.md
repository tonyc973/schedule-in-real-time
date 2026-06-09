# Programări — map-first salon booking for Bucharest

Discover beauty services (saloane, frizerii, unghii, barbershops, spa) on a live
map of Bucharest and see real-time appointment availability — including the
killer feature: **"liber în 2h lângă tine"** (available within the next 2 hours
near you).

Built with Next.js 14 (App Router) · TypeScript (strict) · Prisma + SQLite ·
react-leaflet + OpenStreetMap · Tailwind CSS · Zod · NextAuth · Vitest.

## Setup

```bash
npm install
npx prisma migrate dev      # create the SQLite DB and apply migrations
npx prisma db seed          # 25 Bucharest salons + demo accounts
npm run dev                 # http://localhost:3000
```

Run the availability engine test suite:

```bash
npm run test
```

### Environment

`.env` is committed with safe local defaults:

```
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="dev-secret-…"
NEXTAUTH_URL="http://localhost:3000"
```

No paid APIs or keys are required — OpenStreetMap tiles need none.

### Demo accounts (seeded)

| Role        | Email           | Password   |
| ----------- | --------------- | ---------- |
| Client      | `client@demo.ro`| `demo1234` |
| Salon owner | `owner@demo.ro` | `demo1234` |

The owner account owns the first seeded salon (*Studio Bellezza*).

## What's implemented (Phase 1 — Discovery)

- **Map home (`/`)** — full-screen Leaflet map centred on Bucharest with custom
  per-category pins. Pins for salons free within 2h pulse green. Marker popups
  show name, rating, price level, next available slot and a *Vezi detalii*
  button.
- **Filter bar** (overlaid) — category, max price level, min rating, active
  discounts, and a **"⚡ Liber în 2h"** toggle. Filters update markers live via
  API query params.
- **List / map toggle** for mobile; a synced sidebar list on desktop.
- **Salon detail (`/salon/[id]`)** — photo gallery, services with
  prices/durations/discounts, staff, working hours, reviews, and a mini-map.

Booking, dashboards and review submission are Phases 2–4 (see `SPEC.md`).

## Architecture

```
src/
  lib/
    availability/        # the heart of the app — the slot engine
      slots.ts           #   pure minutes-domain core (no DB, no timezone)
      time.ts            #   UTC ↔ Europe/Bucharest boundary helpers
      engine.ts          #   wires persisted data → core; next-available search
      booking.ts         #   transactional booking + conflict detection
      *.test.ts          #   Vitest suites (27 tests)
    salons.ts            # list (with computed next slot) + detail queries
    enums.ts, dto.ts, validation.ts, format.ts, constants.ts
  app/
    page.tsx             # map home
    salon/[id]/page.tsx  # salon detail
    api/salons/…         # GET list, GET detail, GET availability (Zod-validated)
  components/            # MapView, FilterBar, SalonCard, SalonDetail, MiniMap, …
prisma/
  schema.prisma          # Postgres-compatible schema (SQLite in dev)
  seed.ts                # 25 realistic salons across real neighborhoods
```

### Availability engine

The engine is intentionally split so the booking logic is deterministic and
unit-testable without a database:

1. **`slots.ts`** works purely in *minutes from local midnight*. Given opening
   hours, staff, service duration and busy intervals it returns 15-minute-aligned
   bookable slots — a slot is bookable only if the full service duration fits
   before closing and at least one staff member is free.
2. **`time.ts`** converts between UTC instants (how everything is stored) and
   Europe/Bucharest wall-clock parts (how working hours are expressed),
   DST-aware.
3. **`engine.ts`** translates appointments into the minutes domain, excludes
   past slots for *today*, and computes the salon's **next available slot** for
   the map.
4. **`booking.ts`** creates appointments transactionally. A double-booking is
   prevented two ways: an in-transaction overlap check **and** a
   `@@unique([staffMemberId, startTime])` DB constraint as the hard backstop, so
   two simultaneous requests for the same slot yield exactly one success.

The Vitest suite covers overlapping bookings, edge-of-closing-time slots, the
double-booking race, cancelled appointments freeing slots, and timezone
correctness.

## API

| Method | Route                                                    | Notes                                  |
| ------ | -------------------------------------------------------- | -------------------------------------- |
| GET    | `/api/salons?category=&maxPrice=&minRating=&discount=&within2h=` | List + computed `nextSlot`      |
| GET    | `/api/salons/:id`                                        | Full salon detail                      |
| GET    | `/api/salons/:id/availability?serviceId=&date=`          | Bookable slots for a day               |

All inputs are validated with Zod; errors are returned as
`{ error: { code, message } }`.
