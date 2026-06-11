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
        // sits in the same hue cluster but with better contrast on
        // white and a friendlier "travel" feel.
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
        },
        // Surfaces & backgrounds: stone-50 is a warm off-white that's
        // easier on the eyes than pure white for long-scroll lists.
        surface: "#ffffff",
        background: "#fafaf9",
        // Three semantic text levels cover ~95% of needs.
        ink: {
          primary: "#0f172a",
          secondary: "#475569",
          muted: "#94a3b8",
        },
        danger: {
          50: "#fff1f2",
          500: "#e11d48",
          600: "#be123c",
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
