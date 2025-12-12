import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      },
      colors: {
        brand: {
          50: "#fbfdff",
          100: "#eff6ff",
          200: "#d9ecff",
          300: "#bcdeff",
          400: "#99ccff",
          500: "#74b6ff",
          600: "#4f98f5",
          700: "#3276d0",
          800: "#2050a3",
          900: "#102f64"
        }
      },
      boxShadow: {
        elevated: "0 25px 45px -20px rgba(15, 23, 42, 0.6)"
      }
    }
  },
  plugins: []
};

export default config;

