import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        coffee: {
          950: "#140A06",
          900: "#1E120A",
          800: "#2C1810",
          700: "#44261A",
          600: "#603824",
          500: "#8B5A3E",
          400: "#B88362",
          300: "#D8AC90",
          200: "#EAD4C5",
          100: "#F5E9DF",
          50: "#FAF6F2",
        },
        caramel: {
          DEFAULT: "#D97736",
          dark: "#B85C20",
          light: "#E89B67",
        },
        cream: {
          DEFAULT: "#FDFBF7",
          muted: "#F7F2EB",
        },
        caxoi: {
          pink: "#FFD6E5",
          pinkLight: "#FFF0F5",
          rose: "#E11D48",
          coral: "#F43F5E",
          yellow: "#FBBF24",
          egg: "#FEF08A",
          cat: "#4B5563",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
