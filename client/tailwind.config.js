/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.{js,ts,jsx,tsx}",
    "./index.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./layouts/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./index.css"
  ],
  theme: {
    extend: {}
  },
  plugins: []
};
