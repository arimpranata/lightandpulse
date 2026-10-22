# Gap analysis: BALI LENS spec vs. this repository

Compares the code, as of 2026-10-22, with the [BALI LENS build spec](spec/bali-lens-build-spec.md), which replaced the earlier Bali Experience AI v1.0 spec ([D-016](decisions.md#d-016-adopt-the-bali-lens-build-spec)). Section numbers (§) refer to the BALI LENS spec. Decisions are tracked in [decisions.md](decisions.md).

## Summary

The spec's MVP traveller flow (§28, §34) runs end to end in the Expo app: onboarding → AI profile → explore → journey builder → route comparison → one-cart multi-vendor checkout → payment → booking confirmation → guide/driver matching → journey map → Cultural Guardian. Planning, ranking, routing, matching, cart, booking and payment logic live in a typed domain layer (`app/src/domain`) with 50 unit tests. Everything runs on the device against demo inventory, behind interfaces a backend can take over.

What is not built yet needs a platform backend, which depends on the hosting decision ([D-002](decisions.md#d-002-backend-stack-and-hosting)): accounts and RBAC, server-side inventory and booking, a real payment provider, an LLM concierge, the vendor portal, admin tools and the community control panel.

| Status | Meaning |
| --- | --- |
| ✅ Done | Implemented and tested in this repository |
| 🟡 Partial | Implemented on the device or with demo data; needs the backend or a provider to be production-ready |
| ⛔ Missing | Not started |

## Acceptance criteria (§33)

| Area | Done when | Status |
| --- | --- | --- |
| Navigation | All five primary tabs exist and route correctly | ✅ Home, Explore, Journey, Map, Profile |
| Onboarding | Slider preferences persist and generate a structured profile | ✅ Persisted on the device; `profileVector()` produces the §32 JSON shape |
| AI | AI can create, explain, edit and re-plan itineraries using inventory tools | 🟡 Rule-based planner and keyword intent parser use the inventory tool functions; no LLM yet (D-009) |
| Catalog | Destination/experience/event/vendor pages use structured data | ✅ Typed entities; experiences, events and vendors are demo records |
| Booking | One multi-vendor order end to end in a test environment | ✅ Parent order with child supplier bookings, covered by tests and a browser run |
| Payment | State transitions modelled and idempotent | ✅ State machines, idempotent order creation, replay-safe callbacks; demo payment provider only |
| Mobility | Guide/driver matched and shown in a confirmed booking | ✅ Matching by language, specialty, area, availability, capacity and quality |
| Map | Route options with cost/time assumptions | ✅ Four modes with stated assumptions; demo rates (D-012) |
| Culture | Verified rules can block or modify a recommendation | 🟡 Guardian blocks/modifies and gates booking; the demo rules are not yet verified by a community source (D-010) |
| Vendor | Vendor creates inventory and manages bookings in a portal | ⛔ Needs the backend |
| Admin | Admin approves content and maintains cultural rules | ⛔ Needs the backend |
| QA | Critical flows have automated tests and monitoring hooks | 🟡 Domain unit tests; the browser flow was run manually; no CI or monitoring yet |

## Screens (§7)

| ID | Screen | Status | Where |
| --- | --- | --- | --- |
| S01 | Splash / Welcome | ✅ | `src/app/onboarding/index.tsx` (language, guest start; sign-in needs accounts) |
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
| §14 PSP abstraction and status sets for cart, payment, booking, settlement, refund | `domain/payments.ts`, `services/demo-payment-provider.ts` | ✅ / 🟡 real provider pending (D-007) |
| §15 Guide/driver matching; no contact before booking | `domain/matching.ts`; profiles hide contact until confirmed | ✅ |
| §16 Verified, versioned, owned rules; block/modify; etiquette before booking and navigation | `domain/cultural.ts`; checkout acknowledgement; Map "Before you go" | 🟡 rules unverified (D-010) |
| §17 Community & destination control panel | — | ⛔ Phase 2 |
| §18 Vendor portal | — | ⛔ |
| §19 Events as first-class inventory | Events are bookable and plannable; pre/post-event suggestions not yet | 🟡 |
| §20 Search filters | Keyword, type and interest; date, price and language filters not yet | 🟡 |
| §21 Reviews & trust | Bayesian rating score for ranking; no review submission | 🟡 |
| §22 Notifications | In-app alerts on Home only; no push | 🟡 |
| §23 Service boundaries; audit metadata on mutations | Domain modules follow the boundaries; payment audit trail only | 🟡 |
| §24 AI tool contracts | Functions exist for search, get item, check availability, create booking, calculate route, cultural rules, match guide/driver, payment options, create payment; not yet exposed to an LLM | 🟡 |
| §25 Privacy & security | No personal data leaves the device; no RBAC (no accounts yet) | 🟡 |
| §26 Localization: Bahasa Indonesia + English | Full UI in both languages; content (place and experience descriptions) is English only | 🟡 |
| §26 Offline resilience | Profile, journey, bookings and pass codes stored on the device | ✅ |
| §27 Analytics | — | ⛔ |
| §35 Stack | Expo app matches; backend stack follows D-002 | 🟡 |
| §36 Design direction | Ocean-blue brand, teal actions, earth/gold accents, rounded cards, map-led discovery; gradients instead of photography | 🟡 |

## Next steps

1. Decide [D-002](decisions.md#d-002-backend-stack-and-hosting) (backend and hosting), then build the backend that the domain interfaces expect: inventory, availability, cart/order/booking, payments and cultural rules, with RBAC and audit logs (§23, §25).
2. Choose the payment provider (D-007) and implement its adapter against `PaymentProvider`.
3. Choose the AI provider (D-009) and expose the §24 tool functions to it; keep the rule-based planner as the validator and fallback.
4. Appoint cultural rule owners (D-010) and replace the demo rules with verified, sourced records.
5. Build the vendor portal and admin content tools (MVP items still open), then Phase 2 (§29).
