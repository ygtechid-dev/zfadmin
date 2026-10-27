/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        naqupos: {
          primary: '#C58940',
          secondary: '#FAEAB1',
          accent: '#E5BA73',
          dark: '#453C67',
          cream: '#FAF8F1',
          sage: '#9EB29C',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        serif: ['Outfit', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
