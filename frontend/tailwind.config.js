/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F5F7FB",
        section: "#EEF2F8",
        surface: "#FFFFFF",
        soft: "#FAFBFD",
        elevated: "#FFF4EB",
        primary: {
          DEFAULT: "#FF6B00",
          dark: "#E55A00",
          soft: "#FFF1E3"
        },
        brand: {
          DEFAULT: "#153A8A",
          dark: "#0F2A66",
          soft: "rgba(21, 58, 138, 0.10)",
          50: "#EEF2F8",
          100: "#E1E8F4",
          500: "#153A8A",
          600: "#0F2A66",
          900: "#0E1B3D"
        },
        danger: {
          DEFAULT: "#E63946",
          soft: "#FCE7E9"
        },
        highlight: {
          DEFAULT: "#FFB703",
          soft: "#FFF6DE"
        },
        success: {
          DEFAULT: "#0F9D5A",
          soft: "rgba(15, 157, 90, 0.14)"
        },
        ink: {
          DEFAULT: "#0E1B3D",
          body: "#3B4A6B",
          muted: "#6B7893"
        },
        line: "#E1E6EE"
      }
    }
  },
  plugins: []
};
