/** @type {import('tailwindcss').Config} */
module.exports = {
  // Class-based dark mode (instead of the default `media`). We're not
  // shipping dark mode in this slice, but NativeWind 4 throws at runtime
  // if anything tries to manually set the color scheme while the config
  // is on `media`. ``class`` keeps it inert until we add `dark:` styles.
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Refinement of the previous #0a6b2e brand colour. Emerald-600
        // R1 redesign: brand shifts emerald → teal (Stitch design language).
        // teal-600 is the accent; the scale is teal-50…700 around it.
        // Keep the SEMANTIC name `brand` so all screens inherit the change.
        brand: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
        },
        // Surfaces & backgrounds: slate-50, a cool off-white matching the
        // teal palette.
        surface: "#ffffff",
        background: "#f8fafc",
        // Three semantic text levels cover ~95% of needs.
        ink: {
          primary: "#0f172a",
          secondary: "#475569",
          muted: "#94a3b8",
        },
        // Danger: rose → red (design language).
        danger: {
          50: "#fef2f2",
          500: "#dc2626",
          600: "#b91c1c",
        },
        // New semantic role introduced by the redesign (e.g. "gets back"
        // in Settle, positive states).
        success: {
          50: "#f0fdf4",
          500: "#22c55e",
          600: "#16a34a",
        },
        border: "#e2e8f0",
      },
      fontFamily: {
        sans: ["Inter_400Regular", "ui-sans-serif", "system-ui"],
        medium: ["Inter_500Medium"],
        semibold: ["Inter_600SemiBold"],
        bold: ["Inter_700Bold"],
      },
      borderRadius: {
        "2xl": "16px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
      },
    },
  },
  plugins: [],
};
