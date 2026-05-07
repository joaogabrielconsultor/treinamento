/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        'modal-in': {
          '0%':   { opacity: '0', transform: 'translateY(12px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0)   scale(1)'    },
        },
        'overlay-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'modal-in':   'modal-in   0.22s cubic-bezier(0.16,1,0.3,1) both',
        'overlay-in': 'overlay-in 0.18s ease-out both',
      },
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
