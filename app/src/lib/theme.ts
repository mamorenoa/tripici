/**
 * Design tokens as JS values.
 *
 * NativeWind classes cover styling in JSX, but some APIs take a raw color
 * string — `ActivityIndicator`, `placeholderTextColor`, `Icon` color, the
 * inline-styled web date/time inputs. Those used to hardcode hex that
 * duplicated the Tailwind tokens; when the palette changed they went stale.
 *
 * This module is the single source of truth for those imperative colors.
 * Keep it in sync with the `colors` block in `tailwind.config.js` — same
 * values, same semantic names.
 */

export const colors = {
  brand: {
    50: "#f0fdfa",
    100: "#ccfbf1",
    500: "#14b8a6",
    600: "#0d9488",
    700: "#0f766e",
  },
  ink: {
    primary: "#0f172a",
    secondary: "#475569",
    muted: "#94a3b8",
  },
  surface: "#ffffff",
  background: "#f8fafc",
  border: "#e2e8f0",
  danger: {
    50: "#fef2f2",
    500: "#dc2626",
    600: "#b91c1c",
  },
  success: {
    50: "#f0fdf4",
    500: "#22c55e",
    600: "#16a34a",
  },
  white: "#ffffff",
} as const;
