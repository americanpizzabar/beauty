import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: "#0A0A0F",
          50: "#13131A",
          100: "#1A1A24",
          200: "#22222E",
        },
        gold: {
          DEFAULT: "#D4A574",
          light: "#E8C49A",
          dark: "#B8864E",
          muted: "#9A7050",
        },
        pearl: {
          DEFAULT: "#F5F0E8",
          muted: "#C8BFB0",
          dim: "#8A8078",
        },
        rose: {
          skin: "#F8E8E0",
          deep: "#C4857A",
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "slide-up": "slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "shimmer": "shimmer 2s infinite linear",
        "pulse-gold": "pulseGold 2s ease-in-out infinite",
        "scan-line": "scanLine 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(212, 165, 116, 0)" },
          "50%": { boxShadow: "0 0 30px 8px rgba(212, 165, 116, 0.15)" },
        },
        scanLine: {
          "0%": { top: "0%", opacity: "1" },
          "50%": { opacity: "0.6" },
          "100%": { top: "100%", opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gold-shimmer": "linear-gradient(90deg, transparent, rgba(212,165,116,0.3), transparent)",
        "hero-glow": "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212, 165, 116, 0.12), transparent)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
