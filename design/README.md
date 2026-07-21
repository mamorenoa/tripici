# Design handoff (Stitch → app)

Drop zone for UI designs generated with [Stitch](https://stitch.withgoogle.com/)
so they can be turned into code. **Nothing here ships** — it's reference
material, not source. Full methodology lives in the approved redesign plan;
this file is the day-to-day handoff.

## Why the token approach (read once)

The app's look lives in two places, not in the screens:

- `app/tailwind.config.js` — tokens (`brand`, `ink.*`, `surface`, `background`,
  `border`, `shadow-card`, Inter, radii).
- `app/src/components/` — 11 primitives (`Button`, `Card`, `Input`, `Pill`, …).

Screens use `bg-surface`, `text-ink-primary`, `<Card>`, `<Button>` — never raw
colours. So a re-skin = **change tokens + primitives once, and ~20 screens
follow, consistently.** We do NOT paste Stitch screens in (Stitch emits web
`div`/`span`; the app is React Native `View`/`Text`). What we take from Stitch
are the **decisions** (palette, type scale, spacing, radii, shadows, component
shape) — captured in the `DESIGN TOKENS` block the prompt asks for.

## Redesign slices (order)

| Slice | Screen(s) |
|---|---|
| **R1** | Login + Register (+ foundation: tokens, `theme.ts`, `Button/Input/Card`) |
| R2 | Home / trips list |
| R3 | Trip detail (+ cover) |
| R4 | Trip stats |
| R5 | Settle up / debts |
| R6 | Global stats |
| … | expense form, plan form, members, create/edit trip, calendar |

## What to drop here, per slice

Two files, same basename, `Rn-` prefix:

```
design/R1-login.html      ← "Copy code" from Stitch (HTML + Tailwind)
design/R1-login.png       ← screenshot
design/R1-register.html
design/R1-register.png
```

The HTML gives exact values (hex, sizes, radii); the PNG shows the whole.
A Figma link is not usable directly — export HTML or an image.

## Base prompt (paste into EVERY Stitch generation)

> You are designing **Tripinci**, a mobile app for tracking shared travel
> expenses among friends and couples. Users create **trips**, log **expenses**
> (name, amount in EUR, category, payer, date), keep **plans** (activities with
> dates/location/cost), see **stats**, and settle who-owes-whom. It is NOT a
> Splitwise clone — the hero is "how much did this trip cost and on what".
>
> Visual direction: clean, calm, modern, trustworthy — a well-made travel
> product, not a flashy fintech. Generous whitespace, strong typographic
> hierarchy, content-first, one accent colour used sparingly.
>
> Hard technical constraints (output is ported to React Native + NativeWind, a
> Tailwind SUBSET — respect these or it won't translate):
> - Mobile-first at ~390px wide, but each screen must also look right centered
>   on desktop (max-width container, not full-bleed stretched).
> - Tailwind utility classes on the standard scale — avoid arbitrary values.
> - **Flexbox only. No CSS grid.**
> - **No gradients, no backdrop-blur, no CSS filters, no animations.** Solid
>   colours only.
> - Use `gap-*` for spacing — **never `space-x-*`/`space-y-*`**.
> - Stick to `bg-*`, `text-*`, `p-*`, `m-*`, `gap-*`, `rounded-*`, `shadow-*`,
>   `font-*`, `border-*`. One single font family throughout.
>
> At the end, output a short **DESIGN TOKENS** block listing exactly what you
> used: colour palette (hex + role: primary/accent, text levels, surface/
> background, border, danger, success), font family + type scale (size/weight
> per role: title, heading, body, caption), border-radius scale, shadow
> definitions. This token block is the deliverable I port.

**From R2 onward:** also paste the DESIGN TOKENS block **locked in R1**, with
*"Reuse EXACTLY these tokens; do not invent new colours or sizes."*

## Per-slice specs (append to the base prompt)

**R1 · Login + Register**
> Design two screens: **Sign in** and **Create account**.
> - Sign in: brand mark + short tagline at top; a card with an **email** field
>   and a **password** field (with a show/hide eye toggle); a full-width primary
>   button "Sign in"; below the card, a muted "No account yet?" with an accent
>   link "Create one". Include the error state (small red line in the card). A
>   tiny EN/ES language toggle in a top corner.
> - Create account: same shell; fields **display name**, **email**, **password**
>   (helper "At least 8 characters." under it); primary "Sign up"; footer
>   "Already have an account? Sign in".
> - No system/OS header bar — the screen owns the top (branded, full-bleed on
>   mobile; card centered with a max width on desktop).

**R2 · Home / trips list**
> A top bar: greeting "Hi, {name}" left; small actions right (stats icon,
> language toggle, logout icon). A scrollable list of **trip cards** (name,
> optional "Shared" badge, small created-date, chevron). Empty state (icon +
> title + one line). Floating "+" button bottom-right.

**R3 · Trip detail (+ cover)**
> Trip name as title + a row of small icon-only actions (edit, settle, stats,
> members). A **segmented tab bar**: Cover · Plans · Expenses.
> - Cover: photo hero (image + dark scrim) with trip name and date range over
>   it, then summary chips (duration in days, members, plans, total spent).
> - Expenses: big total, horizontal category filter pills, expense rows (bold
>   **name** title; muted meta "category · date · payer"; amount right).
> - Plans: plan cards (colored dot, name, description, meta) + list/calendar
>   view toggle.

**R4 · Trip stats**
> Big "Total spent" + "€X/day · N days" subtitle. Sections as cards: **By
> category** (label, amount, horizontal progress bar, %); **By person** (avatar
> + name + bar + %); **By day** (row of small vertical bars). Empty state.

**R5 · Settle up / debts**
> Section **Balances**: each member with avatar + "owes €X" (red) / "gets back
> €X" (green) / "settled". Section **Who owes whom**: rows "{from} → {to}  €X"
> each with a small "Settle" button. Section **Recorded payments**: rows with
> "Undo". Positive empty state "All settled".

**R6 · Global stats**
> Big total + muted "Your share: €X". Horizontal category filter pills.
> Sections as cards: **By category** (bars), **By trip** (bars + sort toggles
> Total/€-per-day), **By month** (vertical bar chart). Empty state.

## What happens after you drop files

1. **Foundation (R1 only)**: the `DESIGN TOKENS` block is ported into
   `app/tailwind.config.js` (same semantic role names) and a new
   `app/src/lib/theme.ts` centralises the hex used imperatively (spinner
   colours, placeholder, icon defaults, date/time inputs) — killing the
   scattered hardcoded hex so future palette tweaks are one edit.
2. **Screen work**: the slice's screen(s) get re-laid-out to the new design
   (web markup → RN, Tailwind → NativeWind subset). English copy from Stitch is
   throwaway — real text comes from the existing `t()` i18n keys.
3. **Verification**: browser at **375px and 1280px**, before/after screenshots
   including one untouched screen (proves the token change propagated),
   `tsc` clean, console clean.

## Known translation gaps

- **NativeWind ≠ Tailwind**: no CSS grid, `space-x/y-*`, `backdrop-blur`,
  filters, exotic pseudo-selectors. `gap-*` is fine.
- **Gradients/blur** need `expo-linear-gradient` (not a dependency) — that's why
  the prompt forbids them.
- **Date/time inputs** on web are native `<input>` with inline styles — no
  NativeWind; re-styled by hand against `theme.ts`.
- **Navigation chrome** Stitch draws (its own header / bottom nav) is **not
  adopted** in a re-skin — the app keeps the Expo Router header + tab toggle.
  Adopting Stitch's nav is a structural change, decided separately.
- **Dark mode** is out of scope here (roadmap S21); config is on
  `darkMode: "class"` but inert.
