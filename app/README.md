# Tripinci app

Expo / React Native client (web + iOS + Android) following the Clean
Architecture layout described in the root `CLAUDE.md`.

Current state (slice 3): trips MVP with authentication. Anonymous
visitors land on `/login`. Once authenticated, they can list and create
trips. The owner of every trip is the authenticated user.

## Requirements

- Node.js — Expo 56 expects 20.19+ or 22.13+ (22.9 works with warnings).
- A running Tripinci backend (see [`../backend/README.md`](../backend/README.md)).

## First-time setup

```bash
cd app
npm install --legacy-peer-deps   # openapi-typescript declares a TS ^5 peer
```

## Run

```bash
npx expo start
```

In the Expo menu:

- `w` — web (`http://localhost:8081`)
- `i` — iOS simulator (Xcode)
- `a` — Android emulator (Android Studio + a running AVD)

## Token storage

Auth tokens live behind a tiny cross-platform abstraction in
`src/lib/secureStorage.ts`:

- **Native (iOS / Android)** — `expo-secure-store` (Keychain / Keystore).
- **Web** — `localStorage`. ⚠️ Not actually secure against XSS;
  acceptable for dev, must be replaced by httpOnly cookies (or a
  hardened scheme) before going to production.

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
  _layout.tsx                       # root: QueryClientProvider + Stack
  (auth)/
    _layout.tsx                     # redirect to / if already authed
    login.tsx, register.tsx         # route shells
  (app)/
    _layout.tsx                     # redirect to /login if not authed
    index.tsx                       # → TripListScreen
    trips/new.tsx                   # → CreateTripScreen
src/
  views/{auth,trips}/               # screens
  domain/{auth,trips}/              # hooks (TanStack Query) + types
  repositories/{auth,trips}/        # HTTP repositories
  repositories/_generated/api.d.ts  # generated from OpenAPI
  lib/
    api.ts                          # base URL by platform
    apiClient.ts                    # fetch wrapper + Bearer header
    queryClient.ts                  # shared QueryClient
    secureStorage.ts                # cross-platform secure storage
```
