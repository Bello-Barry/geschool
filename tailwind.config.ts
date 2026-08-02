import type { Config } from "tailwindcss";

/**
 * GESchool — Design System (Chantier 19, Phase 0)
 * Palette et tokens harmonisés autour de l'orange brand (#FF6600) et du marine (#1A1A2E).
 * Aucune valeur en dur dans les composants : toujours référencer ces tokens.
 */

// ── Palettes ────────────────────────────────────────────────────────────────

// Orange brand — dérivé de #FF6600 (hsl(24 100% 50%))
const brand = {
  50: "hsl(24 96% 96%)",
  100: "hsl(24 95% 92%)",
  200: "hsl(24 94% 84%)",
  300: "hsl(24 95% 72%)",
  400: "hsl(24 96% 62%)",
  500: "hsl(24 100% 50%)", // #FF6600
  600: "hsl(22 100% 45%)",
  700: "hsl(20 100% 38%)",
  800: "hsl(18 92% 32%)",
  900: "hsl(16 85% 26%)",
};

// Marine — dérivé de #1A1A2E (hsl(240 28% 14%))
const marine = {
  50: "hsl(240 30% 97%)",
  100: "hsl(240 28% 93%)",
  200: "hsl(240 26% 86%)",
  300: "hsl(240 24% 74%)",
  400: "hsl(240 22% 60%)",
  500: "hsl(240 24% 46%)",
  600: "hsl(240 26% 36%)",
  700: "hsl(240 27% 26%)",
  800: "hsl(240 28% 20%)",
  900: "hsl(240 28% 14%)", // #1A1A2E
};

// Gris neutres chauds — harmonisés avec le fond crème
const neutral = {
  50: "hsl(40 20% 99%)",
  100: "hsl(40 18% 96%)",
  200: "hsl(40 16% 92%)",
  300: "hsl(40 14% 86%)",
  400: "hsl(40 12% 74%)",
  500: "hsl(220 10% 58%)",
  600: "hsl(220 12% 46%)",
  700: "hsl(220 14% 34%)",
  800: "hsl(220 16% 24%)",
  900: "hsl(220 18% 16%)",
};

// Sémantiques — teintes adoucies, cohérentes avec le couple orange/marine
const success = {
  50: "hsl(150 60% 95%)",
  100: "hsl(150 55% 90%)",
  500: "hsl(150 60% 40%)",
  600: "hsl(150 65% 34%)",
  700: "hsl(150 70% 28%)",
};

const warning = {
  50: "hsl(38 90% 95%)",
  100: "hsl(38 88% 90%)",
  500: "hsl(38 92% 50%)",
  600: "hsl(36 90% 45%)",
  700: "hsl(34 88% 38%)",
};

const danger = {
  50: "hsl(0 80% 96%)",
  100: "hsl(0 75% 91%)",
  500: "hsl(0 84% 60%)",
  600: "hsl(0 78% 52%)",
  700: "hsl(0 72% 44%)",
};

const info = {
  50: "hsl(215 80% 96%)",
  100: "hsl(215 75% 92%)",
  500: "hsl(215 85% 55%)",
  600: "hsl(215 80% 47%)",
  700: "hsl(215 75% 40%)",
};

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        heading: ["var(--font-outfit)", "Outfit", "system-ui", "sans-serif"],
      },
      // Échelle typographique canonique : 12/14/16/20/24/32
      fontSize: {
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["14px", { lineHeight: "20px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg: ["20px", { lineHeight: "28px" }],
        xl: ["24px", { lineHeight: "32px" }],
        "2xl": ["32px", { lineHeight: "40px" }],
      },
      // Échelle d'espacement sémantique : 4/8/12/16/24/32/48
      spacing: {
        xs: "0.25rem", // 4px
        sm: "0.5rem", // 8px
        md: "0.75rem", // 12px
        lg: "1rem", // 16px
        xl: "1.5rem", // 24px
        "2xl": "2rem", // 32px
        "3xl": "3rem", // 48px
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        full: "9999px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(26,26,46,0.08)",
        elevated: "0 4px 12px rgba(26,26,46,0.12)",
        modal: "0 12px 32px rgba(26,26,46,0.20)",
        "brand-glow": "0 4px 14px rgba(255,102,0,0.35)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        // ── Design System tokens ──
        brand,
        marine,
        neutral,
        success,
        warning,
        danger,
        info,
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.6s ease-out forwards",
        "fade-in": "fade-in 0.8s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
