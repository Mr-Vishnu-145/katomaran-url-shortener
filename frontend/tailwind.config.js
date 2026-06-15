/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'Open Sans', 'Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: 'var(--theme-primary)',
          hover: 'var(--theme-primary-hover)',
        },
        success: 'var(--theme-success)',
        error: 'var(--theme-error)',
        warning: 'var(--theme-warning)',
      }
    },
  },
  plugins: [],
}
