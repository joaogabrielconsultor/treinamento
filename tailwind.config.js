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
          '0%, 100%': { boxShadow: '0 0 4px rgba(20,184,166,0.3)' },
          '50%':      { boxShadow: '0 0 18px rgba(20,184,166,0.65)' },
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
          DEFAULT: '#1e4033',
          hover:   '#2a5645',
          light:   '#edf5f0',
          muted:   '#b8d4c8',
        },
        dk: {
          bg:      '#061a12',
          card:    '#0b2a1d',
          surface: '#0f3324',
          border:  '#1a3a28',
        },
        cyber: {
          900: '#050816',
          800: '#080d18',
          700: '#0B1020',
          600: '#111827',
          500: '#1a2035',
          accent:  '#14B8A6',
          accent2: '#2DD4BF',
          accent3: '#06B6D4',
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
