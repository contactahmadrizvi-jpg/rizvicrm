import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./context/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "#1a1a2e",
        gold:   "#c9a84c",
        "gold-light": "#f0d896",
        "surface-2": "#f4f4f2",
      },
      fontFamily: {
        sans:  ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        serif: ["Instrument Serif", "Georgia", "serif"],
      },
      borderRadius: {
        DEFAULT: "8px",
        sm: "6px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        card:  "0 1px 2px rgba(0,0,0,0.04), 0 4px 16px -4px rgba(0,0,0,0.06)",
        lift:  "0 4px 20px -4px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
        modal: "0 24px 64px -12px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
