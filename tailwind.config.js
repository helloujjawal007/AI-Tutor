/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ["Baloo 2", "sans-serif"],
        body: ["Nunito", "sans-serif"],
      },
      colors: {
        primary: "#ff6b6b",
        secondary: "#4ecdc4",
        accent: "#ffe66d",
        background: "#f8f9fa",
        surface: "#ffffff",
        muted: "#6c757d",
        error: "#e74c3c",
        success: "#2ecc71",
        warning: "#f1c40f",
      },
    },
  plugins: [],
};
