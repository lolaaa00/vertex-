import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        alice: "#E2ECF5",
        wist: "#A4A7E3",
        maj: "#6A4DD4",
        vel: "#6E3377",
        prus: "#000229",
        prus2: "#07083a",
        vgreen: "#34D399",
        vgreen2: "#6EE7B7",
        amber: "#FBBF24",
        amber2: "#FCD34D",
        rose: "#FB7185",
        rose2: "#FDA4AF",
        cyan: "#67E8F9",
        sky: "#38BDF8",
        t1: "#F1F5F9",
        t2: "#94A3B8",
        t3: "#475569",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "vertex-gradient": "linear-gradient(135deg, #6A4DD4, #6E3377)",
        "vertex-gradient-text":
          "linear-gradient(110deg, #A4A7E3 10%, #6A4DD4 50%, #6E3377 90%)",
      },
      animation: {
        drift: "drift 22s ease-in-out infinite alternate",
        breathe: "breathe 6s ease-in-out infinite",
        pulse-dot: "pulse-dot 2s ease-in-out infinite",
        shimmer: "shimmer 8s linear infinite",
        "gn-in": "gn-in .6s cubic-bezier(.16,1,.3,1) forwards",
      },
      keyframes: {
        drift: {
          "0%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(120px,60px) scale(1.1)" },
          "100%": { transform: "translate(-60px,100px) scale(.95)" },
        },
        breathe: {
          "0%,100%": { transform: "translate(-50%,-50%) scale(1)", opacity: "0.7" },
          "50%": { transform: "translate(-50%,-50%) scale(1.12)", opacity: "1" },
        },
        "pulse-dot": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        shimmer: {
          to: { backgroundPosition: "200% center" },
        },
        "gn-in": {
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
