/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#4361EE',
        'primary-dark': '#3451D1',
        teal: '#00B4AB',
        'teal-light': '#E6F7F6',
        'orange-tag': '#F97316',
        'green-check': '#22C55E',
      },
    },
  },
  plugins: [],
};
