import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    screens: {
      sm: "560px",
      md: "768px",
      lg: "980px",
      xl: "1280px",
      "2xl": "1440px",
    },
    extend: {
      colors: {
        black: "#0a0a0a",
        ink: "#111113",
        graphite: "#3a3a3c",
        "graphite-light": "#6b6b6d",
        mist: "#eeeeec",
        "mist-2": "#e2e2df",
        paper: "#f7f7f5",
        gold: "#d4af37",
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      transitionTimingFunction: {
        brand: "cubic-bezier(.16,1,.3,1)",
      },
      maxWidth: {
        container: "1360px",
      },
    },
  },
  plugins: [],
};

export default config;
