/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef5ff",
          100: "#dce9ff",
          200: "#c2d8ff",
          300: "#9fbfff",
          400: "#6f99ee",
          500: "#2758b5",
          700: "#16346d",
          900: "#0d1c38",
        },
        slate: {
          25: "#fafbfc",
          950: "#0f1725",
        },
      },
      fontFamily: {
        sans: ["Public Sans", "Segoe UI", "Tahoma", "sans-serif"],
        display: ["Space Grotesk", "Public Sans", "sans-serif"],
      },
      boxShadow: {
        panel: "0 24px 48px -28px rgba(15, 23, 37, 0.18)",
      },
      borderRadius: {
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
