import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Category colors used for map markers and badges
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
