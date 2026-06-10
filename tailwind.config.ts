import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      colors: {
        // Velvet-noir surfaces + champagne accent (map page design system)
        noir: {
          950: "#0c0a09",
          900: "#14110f",
          800: "#1c1815",
        },
        gold: {
          DEFAULT: "#e8c97d",
          soft: "#ecd9a8",
          deep: "#b89455",
        },
        // Category colors used for map markers and badges
        cat: {
          hair: "#a78bfa",
          barber: "#38bdf8",
          nails: "#f472b6",
          beauty: "#fbbf24",
          spa: "#34d399",
        },
      },
    },
  },
  plugins: [],
};

export default config;
