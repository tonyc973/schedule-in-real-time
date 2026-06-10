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
        // Ivory-editorial accent system (map page design system)
        paper: "#faf8f4",
        brass: {
          DEFAULT: "#a07c3b",
          deep: "#826229",
          soft: "#d9c08a",
        },
        // Category colors used for map markers and badges (mirror enums.ts)
        cat: {
          hair: "#7c3aed",
          barber: "#0ea5e9",
          nails: "#ec4899",
          beauty: "#f59e0b",
          spa: "#10b981",
        },
      },
    },
  },
  plugins: [],
};

export default config;
