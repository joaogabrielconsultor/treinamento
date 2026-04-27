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
          bg:      '#0f1e17', // fundo principal dark
          card:    '#162a1f', // cards dark
          surface: '#1a3024', // inputs, table headers dark
          border:  '#1e3a2a', // bordas dark
        },
      },
    },
  },
  plugins: [],
};
