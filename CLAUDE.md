# CLAUDE.md — Programări (Bucharest salon booking app)

## Project
Map-first booking platform for beauty services (saloane, frizerii, unghii) in Bucharest. Full spec lives in `SPEC.md` — consult it for feature requirements, do not duplicate it here.

## Stack (locked — do not introduce alternatives)
- Next.js 14+ App Router, TypeScript strict mode (no `any`)
- Prisma + SQLite in dev; schema must stay Postgres-compatible
- react-leaflet + OpenStreetMap tiles (no Google Maps, no API keys)
- Tailwind CSS, mobile-first
- Zod validation on every API route input
- NextAuth.js credentials provider
- Vitest for tests

## Commands
- Dev server: `npm run dev`
- Migrate: `npx prisma migrate dev`
- Seed: `npx prisma db seed`
- Tests: `npm run test`

## Conventions
- UI language is Romanian (ro-RO locale for dates/currency, prices in RON)
- All timestamps stored in UTC; display in Europe/Bucharest
- Availability/booking logic lives in `src/lib/availability/` — never duplicate slot logic in components or routes
- Booking creation must be transactional with conflict detection; a double-booking is always a bug
- 15-minute slot granularity everywhere
- API routes return typed errors: `{ error: { code, message } }`

## Rules
- Never modify the Prisma schema without also writing a migration and updating `prisma/seed.ts`
- Any change to the availability engine requires its Vitest suite to pass before moving on
- Run the app and verify the affected page works before declaring a task done
- Commit after each completed unit of work with a descriptive message
