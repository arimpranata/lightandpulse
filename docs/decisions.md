# Decision log

Records product and technical decisions for BALI LENS. The practice comes from §52 of the earlier [Bali Experience AI spec](spec/bali-experience-ai-spec-v1.0.md): *"Do not invent business policy. Record unresolved business decisions explicitly."* The current reference is the [BALI LENS build spec](spec/bali-lens-build-spec.md) (D-016).

Each entry has a status:

- **Decided:** settled; follow it.
- **Open:** needs an owner's call before the work that depends on it starts.
- **Proposed:** a recommendation awaiting confirmation.

Add new entries at the end with the next number. Do not rewrite a decided entry; supersede it with a new one that links back.

---

## D-001: Adopt the specification as the authoritative reference

- **Status:** Superseded by [D-016](#d-016-adopt-the-bali-lens-build-spec), 2026-10-22
- **Decision:** `docs/spec/bali-experience-ai-spec-v1.0.pdf` is the authoritative product and technical specification. The Markdown copy beside it exists for search and review.
- **Consequence:** New work follows the spec's domain model, roadmap (§42) and agent rules (§43–§44). Where the existing code differs, the gap is tracked in [gap-analysis.md](gap-analysis.md) and resolved through entries in this log.

## D-002: Backend stack and hosting

- **Status:** Decided, 2026-10-22: a VPS running Docker (option 1). See [D-019](#d-019-vps-hosting-with-docker-compose) and [D-020](#d-020-platform-api-stack).
- **Context:** The spec requires NestJS, PostgreSQL with PostGIS, Prisma, Redis/BullMQ, WebSockets and Docker, deployed cloud-agnostically (§7, §40, §50). The current backend is a PHP API on MySQL, built to run on Hostinger Cloud Hosting, which offers PHP and MySQL. As far as we know, Hostinger's shared and cloud hosting plans do not run Docker, PostgreSQL or Redis. Confirm against the plan you hold.
- **Options:**
  1. **Adopt the spec stack** on a host that runs containers (for example a VPS, including Hostinger's VPS plans, or a managed container platform with managed PostgreSQL). Keep the PHP API only until M02 replaces it.
  2. **Keep PHP and MySQL** and treat the spec's stack as a later migration. This contradicts §7, §11 (PostGIS) and the M01 acceptance criteria.
  3. **Hybrid:** spec stack for the API and database on a container host; Hostinger Cloud Hosting serves only the static web build and marketing pages.
- **Recommendation:** Option 1 or 3, with the current PHP API kept as the interim content source until M02.
- **Needs:** the owner's choice of hosting and budget.

## D-003: Repository layout

- **Status:** Proposed (follows D-002). Interim layout per [D-020](#d-020-platform-api-stack): `app/`, `server/`, `deploy/vps/`; `api/`, `database/` and the Hostinger bundle are retired.
- **Proposal:** Convert to the §8 pnpm + Turborepo monorepo during M01: `app/` → `apps/mobile`; new `apps/api`, `apps/admin`, `apps/vendor`; shared `packages/*`; `prisma/` replaces `database/`. Retire `api/`, `database/` and `deploy/` once M02 serves the same content.

## D-004: Product name

- **Status:** Name decided (BALI LENS, by the spec adopted in D-016); bundle identifiers open
- **Context:** The app now displays "Bali Lens". The iOS/Android bundle identifiers are still `com.lightandpulse.baliguide` from the prototype; they are hard to change after a store release.
- **Needs:** the final bundle identifiers before the first store build.

## D-005: Existing places become Destinations

- **Status:** Proposed
- **Proposal:** The 22 curated "places" map to the spec's Destination entity, not Experience, since they are attractions rather than bookable vendor products. Keep their slugs in a `slug` column and give each record an opaque ID (§11). Their free-text entry fees stay informational until they are modelled as priced Experiences with real availability (§3: never invent prices).

## D-006: Status of existing etiquette and tips

- **Status:** Proposed
- **Proposal:** Import the current etiquette and per-place tips as draft `CulturalRule` records with `verified = false` and severity left for a cultural reviewer to set (§28). They are not enforced in recommendations until reviewed.
- **Needs:** who acts as `CULTURAL_REVIEWER` (D-010).

## D-007: Payment provider

- **Status:** Open (blocks M06)
- **Context:** §22 lists card, bank transfer, QR/QRIS and e-wallet behind a provider abstraction but names no provider.
- **Needs:** the provider or providers, merchant account details, settlement currency and refund policy.

## D-008: Revenue rules

- **Status:** Open (blocks M06)
- **Context:** §23 requires vendor, guide and driver allocations, a platform fee, tax and an optional community allocation, configurable and versioned. The spec sets no percentages.
- **Needs:** platform fee, tax treatment, community allocation policy and payout schedule.

## D-009: AI model provider

- **Status:** Open (blocks M03)
- **Needs:** the LLM provider and model, data-processing terms, and a monthly cost budget for the AI gateway (§24).

## D-010: Cultural governance ownership

- **Status:** Open (blocks M09, affects M03)
- **Context:** §28 requires rules curated by authorized reviewers, with a source for each rule.
- **Needs:** who the cultural reviewers are (for example a local cultural adviser or partner organization), which sources count as authoritative, and how rule changes are approved.

## D-011: Local-impact and sustainability criteria

- **Status:** Open (blocks M09)
- **Context:** §29 requires 0–100 scores "based on documented platform criteria". The criteria are not in the spec.
- **Needs:** the scoring criteria and who assesses vendors against them.

## D-012: Maps, routing and weather providers

- **Status:** Open (blocks M04)
- **Needs:** providers for routing (§30), maps, and weather/traffic data, chosen with their licence terms and cost.

## D-013: Launch languages

- **Status:** Decided by the BALI LENS spec (§26): Bahasa Indonesia and English at launch
- **Done:** The whole UI is translated. Destination, experience and event descriptions are still English only.
- **Needs:** who writes and reviews Bahasa Indonesia content for inventory descriptions.

## D-014: Data retention and deletion

- **Status:** Open (required before production, §34)
- **Needs:** retention periods for account, trip, location, consent and payment-related records, and the user deletion process.

## D-015: Truncated MVP scope text in the spec

- **Status:** Open
- **Context:** In §4, the Traveller row of the MVP scope table is cut off in the source PDF after "booking, payment, M…". The missing items are unknown.
- **Needs:** the complete text from the specification's author.

## D-016: Adopt the BALI LENS build spec

- **Status:** Decided, 2026-10-22 (by the product owner, who supplied the updated spec)
- **Decision:** [`docs/spec/bali-lens-build-spec.md`](spec/bali-lens-build-spec.md) is the authoritative product specification. It replaces the Bali Experience AI v1.0 spec, which stays in `docs/spec/` for reference.
- **Consequence:** Navigation, screens, ranking weights, status sets and acceptance criteria follow BALI LENS. Engineering rules from v1.0 that BALI LENS does not contradict (tests, idempotency, adapters, no fabricated data) remain in `AGENTS.md`.

## D-017: Build the MVP traveller flow on the device first

- **Status:** Decided, 2026-10-22
- **Context:** The backend stack and hosting (D-002) are still open, but the spec's MVP is a single coherent demo flow (§28, §34).
- **Decision:** The traveller app implements the whole MVP flow against demo inventory, with domain logic in `app/src/domain` behind interfaces that mirror the §24 tool contracts. The payment provider is an adapter (`PaymentProvider`) with a demo implementation. When the backend exists, these services move server-side and the app calls them through the API.
- **Not covered:** vendor portal, admin tools and community control panel, which need the backend and accounts.

## D-018: Demo inventory and placeholder rates

- **Status:** Decided, 2026-10-22 (interim)
- **Decision:** Experiences, events, vendors, guides and drivers are demo records marked `demo: true` and labelled in the UI (§34). Prices, schedules, ratings, transport rates and fee rates are placeholders. Fee rates (`DEMO_FEES`) wait on D-008, transport rates on D-012, and cultural rules on D-010; all are shown with that caveat.
- **Exit:** replace each with real data from the inventory service and the chosen providers.

## D-019: VPS hosting with Docker Compose

- **Status:** Decided, 2026-10-22 (by the product owner: "Pakai hosting vps agar semua fungsi bisa berjalan")
- **Decision:** BALI LENS runs on a VPS with Docker Compose: PostgreSQL 16, the platform API (`server/`) and Caddy, which serves the web app and obtains HTTPS certificates automatically. Files are in `deploy/vps/`.
- **Consequence:** The PHP API, the MySQL schema and the Hostinger upload bundle are retired. Destinations and guide content now come from the platform API's `GET /content`, in the same shape the app already used.
- **Still open:** VPS provider and size, backups off the server, monitoring and alerting (§37).

## D-020: Platform API stack

- **Status:** Proposed, 2026-10-22 (needs the owner's confirmation)
- **Context:** The earlier spec named NestJS, Prisma, PostGIS, Redis/BullMQ and WebSockets (§7). Nothing built so far needs queues, sockets or spatial queries: routing uses straight-line distance and there is no background work yet.
- **Proposal:** Node.js 22 + TypeScript, Fastify, PostgreSQL with plain SQL migrations (`server/migrations`), zod validation and JWT sessions. The server imports the app's pure domain code (`app/src/domain`), so pricing, availability, Cultural Guardian and payment state machines are one implementation on both sides. Add Redis/queues, PostGIS or a framework change when a feature needs them, through a new entry here.
- **Consequence:** Bookings, payments and settlements are server-authoritative: the server re-prices every order, locks inventory per slot, verifies signed payment webhooks and records an audit trail. The app still plans journeys on the device from server inventory.

## D-021: Accounts and roles

- **Status:** Decided, 2026-10-22 (interim, spec §25)
- **Decision:** Roles are `traveller`, `vendor`, `admin` and `cultural_reviewer`. A traveller starts as a guest account, created silently on first launch, and can register later without losing bookings. Staff accounts (vendor, admin, reviewer) are created by an admin. The first admin comes from `ADMIN_EMAIL`/`ADMIN_PASSWORD` on first start.
- **Open within this:** email verification, password reset and social sign-in (need an email provider), community-partner roles (D-010), and data retention (D-014).

