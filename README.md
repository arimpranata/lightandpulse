# Bali Guide

A cross-platform travel companion for Bali, built with Expo (React Native) and Expo Router. Runs on iOS, Android and the web.

## Features

- **Discover**: featured places, category shortcuts and ready-made itineraries.
- **Explore**: search all 22 destinations and filter by category (temples, beaches, nature, waterfalls, culture) and region.
- **Place details**: hours, indicative entry fees, best time to visit, highlights, local tips, nearby places and a link to directions in Maps.
- **Itineraries**: three day-by-day trips shown as a timeline (Classic Bali in 3 days, Temples of the East, Waterfalls & highlands).
- **Saved**: heart any place to add it to a wish list, which is stored on the device.
- **Travel guide**: currency converter with editable rates, arrival and tourist-levy notes, etiquette, useful Balinese and Indonesian phrases, and tap-to-call emergency numbers.
- Light and dark mode.

## Getting started

```bash
npm install
npm start          # then press i / a / w, or scan the QR code with Expo Go
npm run web        # run in the browser
```

## Checks

```bash
npm run typecheck
npm run lint
```

## Project structure

```
src/
  app/                  Expo Router screens
    (tabs)/             Discover, Explore, Saved and Guide tabs
    place/[id].tsx      Place detail
    itinerary/[id].tsx  Itinerary timeline
  components/           Shared UI (cards, chips, icons, converter, …)
  context/              Saved-places store (AsyncStorage)
  data/                 Places, itineraries and guide content
  constants/theme.ts    Colours, spacing, radii and fonts
```

Content lives in `src/data/` as plain TypeScript, so you can add a place by appending to `PLACES` in `src/data/places.ts`. Fees, opening hours, exchange rates and entry rules are indicative and should be reviewed before release.

## Building for the stores

Use [EAS Build](https://docs.expo.dev/build/introduction/): `npx eas-cli@latest build --platform all`. The bundle identifiers are set in `app.json` (`com.lightandpulse.baliguide`).
