import type { Config } from "tailwindcss";

// Tokens espelhados de brand/design-tokens.json — fonte única de verdade.
// Qualquer alteração de marca deve começar lá, não aqui.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        black: "#0a0a0a",
        ink: "#111113",
        graphite: "#3a3a3c",
        "graphite-light": "#6b6b6d",
        mist: "#eeeeec",
        "mist-2": "#e2e2df",
        paper: "#f7f7f5",
        gold: "#b08d57",
        "gold-text": "#8a6d38",
        danger: "#b3432b",
        "danger-text": "#8f3521",
        success: "#3f6b4a",
        "success-text": "#33563b",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
