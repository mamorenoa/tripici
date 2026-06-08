# Tripinci app

Expo / React Native client (web + iOS + Android) following the Clean
Architecture layout described in the root `CLAUDE.md`.

Slice 2: trips MVP — list and create trips. The previous health screen
is gone; `/health` still exists in the backend as a deployment probe.

## Requirements

- Node.js — Expo 56 expects 20.19+ or 22.13+ (22.9 works with warnings).
- A running Tripinci backend (see [`../backend/README.md`](../backend/README.md)).

## First-time setup

```bash
cd app
npm install
```

## Run

```bash
npx expo start
```

In the Expo menu:

- `w` — web (`http://localhost:8081`)
- `i` — iOS simulator (Xcode)
- `a` — Android emulator (Android Studio + a running AVD)

## Regenerate API types

Whenever the backend's OpenAPI schema changes, regenerate the typed
client (the backend must be running):

```bash
npm run generate:api
```

This writes `src/repositories/_generated/api.d.ts`. The file is
committed so a fresh clone can type-check without the backend.

## Backend URL resolution

`src/lib/api.ts` resolves the base URL in this order:

1. `process.env.EXPO_PUBLIC_API_URL`, if set (copy `.env.example` to
   `.env.local` and use your LAN IP for physical devices).
2. `http://10.0.2.2:8000` on Android emulator.
3. `http://localhost:8000` on web and iOS simulator.

## Layout

```
app/
  _layout.tsx               # QueryClientProvider + Stack navigator
  index.tsx                 # route shell → TripListScreen
  trips/new.tsx             # route shell → CreateTripScreen
src/
  views/trips/              # screens
  domain/trips/             # hooks + types (TanStack Query)
  repositories/trips/       # API repository (HTTP)
  repositories/_generated/  # types generated from OpenAPI
  lib/                      # api base url, fetch wrapper, query client
```
