/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1e4033',
          hover:   '#2a5645',
          light:   '#edf5f0',
          muted:   '#b8d4c8',
        },
      },
    },
  },
  plugins: [],
};
