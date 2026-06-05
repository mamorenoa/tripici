# Tripinci app

Expo / React Native client (web + iOS + Android). Currently at the
connectivity-skeleton stage: a single screen that calls the backend's
`/health` endpoint and shows the response.

## Requirements

- Node.js — Expo 56 expects 20.19+ or 22.13+
- A running Tripinci backend (see [`../backend/README.md`](../backend/README.md))

## Run

```bash
cd app
npm install
npx expo start
```

In the Expo menu:

- `w` — web (opens http://localhost:8081)
- `i` — iOS simulator (requires Xcode)
- `a` — Android emulator (requires Android Studio + a running AVD)

## How the app finds the backend

`src/lib/api.ts` resolves the base URL in this order:

1. `process.env.EXPO_PUBLIC_API_URL`, if set (copy `.env.example` to
   `.env.local` and add your LAN IP for physical devices).
2. `http://10.0.2.2:8000` on Android emulator (alias for the host's
   localhost).
3. `http://localhost:8000` everywhere else (web, iOS simulator).
