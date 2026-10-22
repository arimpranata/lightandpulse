# Gap analysis: BALI LENS spec vs. this repository

Compares the code, as of 2026-10-22, with the [BALI LENS build spec](spec/bali-lens-build-spec.md), which replaced the earlier Bali Experience AI v1.0 spec ([D-016](decisions.md#d-016-adopt-the-bali-lens-build-spec)). Section numbers (§) refer to the BALI LENS spec. Decisions are tracked in [decisions.md](decisions.md).

## Summary

The spec's MVP traveller flow (§28, §34) runs end to end: onboarding → AI profile → explore → journey builder → route comparison → one-cart multi-vendor checkout → payment → booking confirmation → guide/driver matching → journey map → Cultural Guardian. Planning, ranking, routing, matching, cart, booking and payment logic live in a typed domain layer (`app/src/domain`, 51 unit tests) that the app and the server share.

The platform API (`server/`, PostgreSQL, deployed to a VPS with Docker Compose, D-019) holds accounts and roles, inventory, availability, orders, payments, settlements, refunds, cultural rules and the audit log. Checkout is server-authoritative, payment webhooks are signed and replay-safe, and vendors, admins and cultural reviewers have a portal in the app. Twenty API integration tests run against a real database. Without an API URL, the app still runs the whole flow on the device.

Not built yet: a real payment provider (D-007), the LLM concierge (D-009), verified cultural rules (D-010), the community control panel, chat, reviews and push notifications.

## Acceptance criteria (§33)

| Area | Done when | Status |
| --- | --- | --- |
| Navigation | All five primary tabs exist and route correctly | ✅ Home, Explore, Journey, Map, Profile |
| Onboarding | Slider preferences persist and generate a structured profile | ✅ Persisted on the device and synced to the server (`/me/state`); `profileVector()` produces the §32 JSON shape |
| AI | AI can create, explain, edit and re-plan itineraries using inventory tools | 🟡 Rule-based planner and keyword intent parser use the inventory tool functions; no LLM yet (D-009) |
| Catalog | Destination/experience/event/vendor pages use structured data | ✅ Typed entities; experiences, events and vendors are demo records |
| Booking | One multi-vendor order end to end in a test environment | ✅ Server-authoritative: re-priced from the database, slot locks prevent overbooking; API integration tests and a browser run against the API |
| Payment | State transitions modelled and idempotent | ✅ Idempotent orders, HMAC-signed webhooks stored by event ID (replays are no-ops), refunds; demo provider until D-007 |
| Mobility | Guide/driver matched and shown in a confirmed booking | ✅ Matching by language, specialty, area, availability, capacity and quality |
| Map | Route options with cost/time assumptions | ✅ Four modes with stated assumptions; demo rates (D-012) |
| Culture | Verified rules can block or modify a recommendation | 🟡 Guardian blocks/modifies and gates booking; the demo rules are not yet verified by a community source (D-010) |
| Vendor | Vendor creates inventory and manages bookings in a portal | 🟡 Portal shows own products, bookings and payouts; edits go to review; completion/no-show releases settlement. Creating a new product from scratch is not built yet |
| Admin | Admin approves content and maintains cultural rules | ✅ Product review, vendor verification, payouts, audit log; cultural rules versioned and verified by admins or cultural reviewers |
| QA | Critical flows have automated tests and monitoring hooks | 🟡 Domain unit tests and API integration tests (idempotency, concurrent overbooking, webhook signatures and replay, refunds, RBAC, cultural gates); health check and structured logs; no CI or alerting yet |

## Screens (§7)

| ID | Screen | Status | Where |
| --- | --- | --- | --- |
| S01 | Splash / Welcome | ✅ | `src/app/onboarding/index.tsx` (language, guest start); accounts in `account.tsx` |
| S02 | Experience Onboarding | ✅ | `onboarding/preferences.tsx` |
| S03 | AI Profile | ✅ | `onboarding/profile.tsx` |
| S04 | Home | ✅ | `(tabs)/index.tsx` |
| S05 | Explore | ✅ | `(tabs)/explore.tsx` (search, type and interest chips, list/map toggle) |
| S06 | Experience Detail | ✅ | `experience/[id].tsx` (no review texts yet, only rating summaries) |
| S07 | Destination Detail | 🟡 | `destination/[id].tsx` (no crowd/capacity data source yet) |
| S08 | Event Detail | ✅ | `event/[id].tsx` |
| S09 | AI Journey Builder | 🟡 | `journey-builder.tsx` (keyword intent parser, not an LLM) |
| S10 | Route Compare | 🟡 | `route.tsx` (demo rates and speeds) |
| S11 | Booking Cart | ✅ | `cart.tsx` |
| S12 | Checkout & Payment | 🟡 | `checkout.tsx` (demo payment provider; vouchers not modelled) |
| S13 | My Journey | ✅ | `(tabs)/journey.tsx`, `order/[id].tsx` (pass codes instead of QR images) |
| S14 | Guide/Driver Profile | ✅ | `guide/[id].tsx`, `driver/[id].tsx`, `match.tsx` |
| S15 | Chat / Trip Support | ⛔ | Needs messaging backend |
| S16 | Map Live Journey | 🟡 | `(tabs)/map.tsx` (schematic map; no live location, pickup or ETA) |
| S17 | Rental | ⛔ | Phase 2 (§29) |
| S18 | Wallet / Loyalty | 🟡 | `wallet.tsx` (transactions and refunds; loyalty is Phase 2) |
| S19 | Cultural Code | ✅ | `cultural-code.tsx` |
| S20 | Post-Trip | ⛔ | Reviews need verified purchasers on the backend (§21) |

## Domain and rules

| Spec | Implementation | Status |
| --- | --- | --- |
| §8 AI never the source of truth for prices, availability or rules | Planner and ranking read inventory records only; reasons are structured facts | ✅ |
| §9 Ranking weights; commission never a factor; explanations | `domain/ranking.ts` with the exact weights; tested | ✅ |
| §10 No overlaps, travel and buffer, opening hours, clustering, pace, meals, hard cultural constraints, locks, alternatives instead of silent replacement | `domain/planner.ts`; tested | ✅ |
| §11 Route modes with displayed assumptions and careful safety language | `domain/routing.ts`; "Safe/Operational" mode waits for real operational data | 🟡 |
| §12 Typed entities with stable IDs | `domain/types.ts` | ✅ |
| §13 One cart, child supplier bookings, per-line policies, fee breakdown, separate settlement, partial cancellation | `domain/commerce.ts`; tested | ✅ (demo fee rates, D-008) |
| §14 PSP abstraction and status sets for cart, payment, booking, settlement, refund | `domain/payments.ts`, `server/src/payments.ts` (signed webhooks) | ✅ / 🟡 real provider pending (D-007) |
| §15 Guide/driver matching; no contact before booking | `domain/matching.ts`; profiles hide contact until confirmed | ✅ |
| §16 Verified, versioned, owned rules; block/modify; etiquette before booking and navigation | `domain/cultural.ts`; rules in the database with versions and verification; the server enforces blocks and acknowledgements at checkout | 🟡 demo rules unverified until owners are appointed (D-010) |
| §17 Community & destination control panel | — | ⛔ Phase 2 |
| §18 Vendor portal | `app/src/app/portal/vendor.tsx`, `server/src/routes/vendor.ts` | 🟡 no new-product creation, calendar or messaging yet |
| §19 Events as first-class inventory | Events are bookable and plannable; pre/post-event suggestions not yet | 🟡 |
| §20 Search filters | Keyword, type and interest; date, price and language filters not yet | 🟡 |
| §21 Reviews & trust | Bayesian rating score for ranking; no review submission | 🟡 |
| §22 Notifications | In-app alerts on Home only; no push | 🟡 |
| §23 Service boundaries; audit metadata on mutations | `audit_log` records actor, source, before/after for orders, payments, bookings, settlements, refunds, moderation and rules | ✅ |
| §24 AI tool contracts | Functions exist for search, get item, check availability, create booking, calculate route, cultural rules, match guide/driver, payment options, create payment; not yet exposed to an LLM | 🟡 |
| §25 Privacy & security | RBAC (traveller, vendor, admin, cultural reviewer); scrypt passwords; JWT sessions; contact data only on bookings; no card data | 🟡 retention and deletion (D-014), password reset |
| §26 Localization: Bahasa Indonesia + English | Full UI in both languages; content (place and experience descriptions) is English only | 🟡 |
| §26 Offline resilience | Profile, journey, bookings and pass codes cached on the device | ✅ |
| §26 Payment callbacks safely replayable; idempotent bookings | `payment_events` keyed by provider event ID; `UNIQUE(user_id, idempotency_key)` | ✅ |
| §27 Analytics | — | ⛔ |
| §35 Stack | Expo app; Node.js/Fastify/PostgreSQL API on a VPS with Docker (D-019, D-020) | 🟡 framework differs from the earlier spec; see D-020 |
| §36 Design direction | Ocean-blue brand, teal actions, earth/gold accents, rounded cards, map-led discovery; gradients instead of photography | 🟡 |

## Next steps

1. Choose the payment provider (D-007) and implement its adapter against the server's `PaymentProvider`; the webhook endpoint and state machines are ready.
2. Choose the AI provider (D-009) and expose the §24 tool functions to it through the API; keep the rule-based planner as the validator and fallback.
3. Appoint cultural rule owners (D-010) and replace the demo rules with verified, sourced records in the portal.
4. Confirm the API stack (D-020); add CI that runs the app and server checks, and monitoring/alerting on the VPS.
5. Vendor product creation, availability calendars, email (verification, password reset, booking confirmations), then Phase 2 (§29).
