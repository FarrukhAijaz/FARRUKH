/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/**/*.{js,jsx,ts,tsx}',
    './src/renderer/index.html'
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Bebas Neue', 'Impact', 'sans-serif'],
        body:    ['Montserrat', 'Inter', 'system-ui', 'sans-serif'],
        accent:  ['Angeletta', 'cursive'],
      },
      colors: {
        cream: {
          50:  '#FDFAF5',
          100: '#F8F3E8',
          200: '#EDE5D0',
          300: '#DDD0B3',
          400: '#C9B98A',
        },
        forest: {
          300: '#74C69D',
          400: '#52B788',
          500: '#40916C',
          600: '#2D6A4F',
          700: '#1B4332',
        },
        ink: {
          50:  '#4A4A4A',
          100: '#3A3A3A',
          200: '#2C2C2C',
          300: '#1C1C1C',
          400: '#111111',
        }
      }
    }
  },
  plugins: []
}
