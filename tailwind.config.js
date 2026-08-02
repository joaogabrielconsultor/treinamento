/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        'modal-in': {
          '0%':   { opacity: '0', transform: 'translateY(14px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0)   scale(1)'    },
        },
        'overlay-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 4px rgba(198,255,0,0.3)' },
          '50%':      { boxShadow: '0 0 18px rgba(198,255,0,0.65)' },
        },
        'radar-ping': {
          '0%':       { transform: 'scale(1)', opacity: '0.8' },
          '75%, 100%':{ transform: 'scale(2.2)', opacity: '0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-5px)' },
        },
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'border-spin': {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'cyber-line': {
          '0%':   { transform: 'translateX(-100%)', opacity: '0' },
          '50%':  { opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
      },
      animation: {
        'modal-in':   'modal-in   0.24s cubic-bezier(0.16,1,0.3,1) both',
        'overlay-in': 'overlay-in 0.18s ease-out both',
        'shimmer':    'shimmer 2.5s linear infinite',
        'pulse-glow': 'pulse-glow 2.2s ease-in-out infinite',
        'radar-ping': 'radar-ping 1.6s cubic-bezier(0,0,0.2,1) infinite',
        'float':      'float 3.5s ease-in-out infinite',
        'fade-up':    'fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both',
        'cyber-line': 'cyber-line 3s ease-in-out infinite',
      },
      colors: {
        brand: {
          DEFAULT: '#C6FF00',
          hover:   '#B0E600',
          light:   '#EEFFB0',
          muted:   '#7C7C7C',
        },
        dk: {
          bg:      '#000000',
          card:    '#0C0C0C',
          surface: '#151515',
          border:  '#1f1f1f',
        },
        cyber: {
          900: '#000000',
          800: '#050505',
          700: '#0A0A0A',
          600: '#111111',
          500: '#181818',
          accent:  '#C6FF00',
          accent2: '#C6FF00',
          accent3: '#A9E000',
        },
      },
      fontFamily: {
        sans: [
          'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI',
          'system-ui', 'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
