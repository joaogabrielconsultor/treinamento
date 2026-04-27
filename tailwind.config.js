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
        // Dark mode green-tinted surfaces
        dk: {
          bg:      '#061a12', // fundo principal dark
          card:    '#0b2a1d', // cards dark
          surface: '#0f3324', // inputs, table headers dark
          border:  '#1a3a28', // bordas dark
        },
      },
    },
  },
  plugins: [],
};
