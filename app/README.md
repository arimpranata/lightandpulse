# BALI LENS app

The traveller app for BALI LENS, built with Expo (React Native) and Expo Router. It runs on iOS, Android and the web, in English and Bahasa Indonesia.

## What it does

The app implements the MVP flow from the [BALI LENS build spec](../docs/spec/bali-lens-build-spec.md) (§28, §34):

1. **Onboarding:** language, preference sliders (spiritual, culture, wellbeing, adventure, culinary, arts, beach, nightlife), local ↔ luxury, slow ↔ packed, budget, trip dates, party and base region.
2. **Bali profile:** a generated summary ("60% Culture & Tradition, 50% Spiritual…; Balanced pace; Mid-range budget"), editable at any time.
3. **Home:** next activity, recommendations with reasons, alerts and a cultural tip.
4. **Explore:** places, experiences, events, guides and drivers, with search, type and interest filters and a list/map toggle.
5. **Journey:** a day-by-day plan you can lock, remove from and re-plan; add bookable items, a guide or a driver to the cart; compare routes.
6. **Journey Builder:** short instructions such as "more culture, slower pace" or "tanpa pantai, 5 hari" re-plan the trip.
7. **Cart and checkout:** one cart across vendors, per-line cancellation policies, cultural acknowledgement before booking, and a demo payment that can be set to fail.
8. **Bookings:** pass codes, per-line cancellation with refund rules, and an operator ledger (fees and settlements) for the demo.
9. **Map:** the day's stops on a schematic map, etiquette before you go, and Open in Maps.
10. **Cultural Code, Wallet, Travel essentials** from the Profile tab.
11. **Account and partner portal** (platform API mode): guest account with optional registration, and `/portal` for vendors, admins and cultural reviewers.

The app runs in one of two modes:

- **Platform API mode** (`EXPO_PUBLIC_API_URL` set): content, inventory, availability, orders and payments come from the BALI LENS API in `../server`. Checkout is confirmed by the server once the payment provider's signed webhook arrives.
- **On-device mode** (no API URL): everything runs on the device against bundled demo inventory, as a self-contained demo.

Marketplace inventory seeded from `src/demo` (experiences, events, vendors, guides, drivers, cultural rules) is **demo data**, labelled as such in the UI (decision D-018). Payments use a demo provider until D-007 is decided; no money moves.

## Getting started

All commands run from this `app/` folder.

```bash
npm install
npm start          # then press i / a / w, or scan the QR code with Expo Go
npm run web        # run in the browser
```

## Checks

```bash
npm run typecheck
npm run lint
npm test           # domain unit tests (Jest)
```

## Code layout

```
src/
  app/                    Expo Router screens
    (tabs)/               Home, Explore, Journey, Map, Profile
    onboarding/           Welcome, preferences, Bali profile
    destination|experience|event|guide|driver/[id].tsx
    journey-builder, route, match, cart, checkout, order/[id], cultural-code, wallet, essentials, account
    portal/               Partner portal: sign-in, vendor, admin, cultural rules
  domain/                 Pure TypeScript business logic, no React Native imports
    types.ts              Entities (spec §12, §32)
    ranking.ts            Recommendation score and reasons (§9)
    planner.ts            Journey planning and editing (§10)
    routing.ts            Route comparison (§11)
    commerce.ts           Cart, orders, bookings, payment/settlement state machines (§13, §14)
    cart-lines.ts         Cart lines priced from inventory records (also used by the server)
    payments.ts           Payment provider interface (§14)
    cultural.ts           Cultural Guardian (§16)
    matching.ts           Guide and driver matching (§15)
    intent.ts             Journey Builder instruction parser
    __tests__/            Jest tests
  demo/                   Demo inventory and cultural rules (seeded into the server's database too)
  services/               Adapters: platform API client, demo payment provider, maps hand-off
  state/                  App store (on-device or platform API mode) and portal session
  i18n/                   English and Bahasa Indonesia strings
  components/             Shared UI
  data/, context/         Destinations and guide content (bundled, or from the platform API)
```

## Content and the API

Destinations, trip ideas and guide content ship with the app in `src/data/`, so it works offline. If `EXPO_PUBLIC_API_URL` is set (copy `.env.example` to `.env`), the app loads that content from the platform API at startup, caches it, and falls back to the bundled copy when offline (`src/context/content.tsx`). The server seeds its database from the same `src/data/` and `src/demo/` files on first start; later edits in the database are kept.

`src/domain` and `src/demo` are imported by the server (`server/tsconfig.json` maps `@/*` to `app/src/*`), so keep them free of React Native imports.

## Building for the stores

Use [EAS Build](https://docs.expo.dev/build/introduction/): `npx eas-cli@latest build --platform all`. The bundle identifiers in `app.json` are still the prototype's (`com.lightandpulse.baliguide`) until decision D-004 settles them. `EXPO_PUBLIC_API_URL` is fixed at build time, so set it in `.env` (or the EAS environment) before building.
