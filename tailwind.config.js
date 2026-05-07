/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        amber: {
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
        },
        warm: {
          white: '#FFFBF5',
          tan: '#F5E6D3',
          brown: '#92400E',
          dark: '#1C0A00',
        },
      },
      fontFamily: {
        sans: ['Inter', 'System'],
      },
    },
  },
  plugins: [],
};
