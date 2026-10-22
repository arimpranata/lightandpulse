# Gap analysis: current project vs. specification v1.0

Compares this repository, as of 2026-10-22, with the [Bali Experience AI specification v1.0](spec/bali-experience-ai-spec-v1.0.md). Section numbers (§) refer to the specification. Decisions that this analysis depends on are tracked in [decisions.md](decisions.md).

## Summary

The repository is a **pre-M01 prototype**: a read-only travel guide, not the connected booking platform the specification describes. It already follows the spec's mobile stack (§7: React Native, Expo, TypeScript strict mode, Expo Router), and its UI, theme and curated content can carry forward. Almost everything else in the spec is still to be built: accounts, preferences, AI, trips, booking, payments, mobility, vendor and admin portals, and cultural governance as enforced data.

The largest conflict is the backend and hosting. The spec calls for NestJS, PostgreSQL with PostGIS, Prisma, Redis and Docker (§7). The current backend is PHP with MySQL, chosen to run on Hostinger Cloud Hosting. This choice has to be made before M01 starts; see [D-002](decisions.md#d-002-backend-stack-and-hosting).

| Status | Meaning |
| --- | --- |
| ✅ Matches | Already consistent with the spec |
| 🟡 Partial | Something comparable exists but needs reshaping |
| ⛔ Missing | Not started |
| ⚠️ Conflict | Current choice contradicts the spec; needs a decision |

## By area

### Platform and architecture

| Spec | Current state | Status |
| --- | --- | --- |
| §7 Mobile: React Native + Expo + TypeScript + Expo Router | `app/`: Expo SDK 58, Expo Router, TypeScript `strict: true` | ✅ |
| §7 State: TanStack Query + Zustand | React context (`app/src/context/content.tsx`, `saved-places.tsx`) with AsyncStorage | 🟡 |
| §7 Forms: React Hook Form + Zod | No forms yet | ⛔ |
| §7 Web: Next.js + Tailwind + shadcn/ui (admin, vendor) | Only the Expo web export of the traveller app | ⛔ |
| §7 Backend: NestJS + TypeScript | `api/`: read-only PHP 8.1 API | ⚠️ |
| §7 Database: PostgreSQL + PostGIS, Prisma | `database/`: MySQL/MariaDB schema, plain SQL | ⚠️ |
| §7 Cache/queue, storage, realtime, observability | None | ⛔ |
| §7 Infrastructure: Docker + CI/CD, cloud-agnostic | Hostinger upload bundle (`deploy/build.sh`); no Docker, no CI | ⚠️ |
| §8 pnpm + Turborepo monorepo (`apps/`, `packages/`, `prisma/`) | `app/`, `api/`, `database/`, `deploy/` with npm in `app/` only | 🟡 |

### Data model (§9–§11)

| Spec | Current state | Status |
| --- | --- | --- |
| Destination: name, slug, geo, region/district, crowd, sustainability, cultural sensitivity | `places`: name, region, area, lat/lng, description, tips. Closest match to Destination; no crowd, sustainability or sensitivity fields | 🟡 |
| Experience, Package, Event, Ticket, Vendor | Not modelled. Current "places" are attractions, not bookable vendor products | ⛔ |
| Trip / ItineraryDay / ItineraryItem | `itineraries`, `itinerary_days`, `itinerary_stops` are curated templates, not user trips; no dates, costs or route references | 🟡 |
| CulturalRule with severity INFO/WARNING/RESTRICTED/PROHIBITED (§28) | Etiquette and per-place tips exist as free text (`guide_tips`, `place_tips`), with no severity, entity links, reviewer or validity dates | 🟡 |
| User, TravellerPreference, Booking, Payment, RevenueAllocation, Payout, Availability, Notification, AuditLog, ConsentLog | None | ⛔ |
| §11 Opaque UUID/CUID IDs | Human-readable slugs (`tanah-lot`) used as primary keys. These can become the Destination `slug` field | ⚠️ |
| §11 Money as decimal plus explicit currency | Entry fees are display strings (`≈ IDR 75,000`); exchange rates are `DECIMAL(12,2)` | 🟡 |
| §11 PostGIS for geography | `DECIMAL(9,6)` latitude/longitude | ⚠️ (follows D-002) |
| §11 Timestamps in UTC | `TIMESTAMP` columns (stored as UTC by MySQL) | ✅ |
| §41 Mark demo records explicitly | Seed is curated real-world content with indicative fees; no demo flag | ⛔ |

### Traveller app (§12–§18)

| Spec | Current state | Status |
| --- | --- | --- |
| §12 Tabs: Home, Explore, AI, My Bali, Profile | Tabs: Discover, Explore, Saved, Guide | 🟡 |
| §12 Auth and Onboarding stacks | None | ⛔ |
| §12 Detail routes (Experience, Destination, Event, Guide, Driver, Rental, Booking, Payment, Trip) | `place/[id]` (≈ Destination) and `itinerary/[id]` (≈ Trip template) | 🟡 |
| §13 Onboarding flow and §14 preference sliders | None | ⛔ |
| §15 Home: "How do you want to experience Bali?", CREATE MY BALI, Recommended, Near You, What's Happening, Cultural Tip, Active Trip | Discover tab: greeting, search, categories, top picks, ready-made trips, guide teaser | 🟡 |
| §16 Experience detail (AI match, included, schedule, cultural guidelines, local impact, reviews, BOOK NOW) | Place detail: facts, description, highlights, local tips, Open in Maps, nearby places | 🟡 |
| §17 My Bali and Live Trip | Saved list and itinerary timeline only | ⛔ |
| §18 `<CulturalTip />`, `<CulturalWarning />`, `<CulturalRestriction />` | Etiquette list and tips card, not severity-driven components | 🟡 |
| §46 Offline: confirmed itinerary/tickets available offline | Content falls back to the bundled copy and the last cached API response | 🟡 |
| §39 Loading/empty/error/success states | Empty states exist (Explore, Saved); no loading or error UI because content is local | 🟡 |

### API (§19–§20)

| Spec | Current state | Status |
| --- | --- | --- |
| §19 REST domains: auth, users, catalogue, search, trips, itinerary, AI, booking, payment, mobility, culture, reviews, notifications | `/content`, `/places`, `/itineraries`, `/guide`, `/categories`, `/regions`, `/health` (read-only catalogue) | 🟡 |
| §20 Envelope `{ success, data, meta.requestId }` and error codes | Bare JSON bodies and `{ "error": "message" }` | ⚠️ |
| §39 OpenAPI | None | ⛔ |
| §35 Rate limiting, JWT, RBAC | Not applicable yet (no auth or writes); CORS and `nosniff` headers set | ⛔ |

### AI, booking, payments, mobility, portals (§21–§33)

None of these exist yet: AI gateway and tools (§24–§27), recommendation scoring (§26), booking state machine and inventory (§21), payment adapters and webhooks (§22), revenue allocation (§23), smart routing (§30), vendor portal (§31), admin portal (§32), notifications and realtime (§33). Status for all: ⛔.

### Quality, delivery and documentation (§34–§51)

| Spec | Current state | Status |
| --- | --- | --- |
| §37 Unit, integration, E2E, contract, security tests | None automated. Checks so far were typecheck, lint, `php -l`, `database/check-api.mjs` and manual browser runs | ⛔ |
| §40 CI pipeline | None | ⛔ |
| §34 Privacy and consent | No personal data collected yet; Saved list stays on the device | ✅ for now |
| §50 `pnpm` commands, `docker compose`, Prisma migrate/seed | `npm` in `app/`, SQL files imported through phpMyAdmin | ⚠️ (follows D-002) |
| §51 Required docs (17 files under `docs/`) | `README.md`, `app/README.md`, this analysis and the decision log | ⛔ Write each doc in the milestone that builds its area |

## What carries forward

- **Expo app shell:** navigation, theme tokens with light and dark mode, shared components (`AppText`, `Chip`, `Icon`, place cards, `PlaceArt`) and the currency converter.
- **Curated content:** 22 destinations with coordinates, highlights and tips; phrases, etiquette, essentials and emergency numbers. Destinations map to the spec's Destination entity. Etiquette and tips are draft input for `CulturalRule` records, which still need a reviewer (§28).
- **Offline-first content loading:** the bundled-fallback-plus-cache pattern in `content.tsx` is a starting point for §46 (connectivity loss).
- **Cultural framing:** temple dress code, offerings and Nyepi guidance already present in the Guide tab.

## Suggested next steps

1. Resolve [D-002](decisions.md#d-002-backend-stack-and-hosting) (backend and hosting), since every milestone depends on it.
2. **M01 Foundation (§45):** pnpm/Turborepo monorepo, move `app/` to `apps/mobile`, NestJS API, Prisma with PostgreSQL/PostGIS, Docker Compose, auth, RBAC, preferences, OpenAPI, tests and CI.
3. **M02 Catalogue:** migrate the current destinations into the new schema (slugs kept as a field, opaque IDs as keys), add Vendor, Experience and Event, then retire `api/` and `database/` once the app reads from the new API.
4. Write each §51 document as its milestone lands, starting with `architecture.md`, `database.md` and `api.md` in M01.
