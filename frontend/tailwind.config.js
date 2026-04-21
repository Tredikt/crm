/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        surface: {
          DEFAULT: "hsl(0 0% 98%)",
          muted: "hsl(0 0% 96%)",
          card: "hsl(0 0% 100%)",
        },
        line: "hsl(0 0% 90%)",
        ink: {
          DEFAULT: "hsl(0 0% 9%)",
          muted: "hsl(0 0% 40%)",
        },
        accent: "hsl(220 14% 20%)",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.04)",
        card: "0 1px 3px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};
