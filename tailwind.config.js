/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/apps/**/*.{js,ts,jsx,tsx}", // <-- This is the critical line
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

