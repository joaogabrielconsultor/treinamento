/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        'modal-in': {
          '0%':   { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
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
        // no-op: o brilho pulsante saiu do sistema visual
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
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
          '0%':   { opacity: '0', transform: 'translateY(3px)' },
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
      // transition-all só anima propriedades baratas (nada de padding/altura tremendo)
      transitionProperty: {
        all: 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, width',
      },
      transitionTimingFunction: { DEFAULT: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      transitionDuration: { DEFAULT: '160ms' },
      animation: {
        'modal-in':   'modal-in   0.28s cubic-bezier(0.22,1,0.36,1) both',
        'overlay-in': 'overlay-in 0.2s cubic-bezier(0.22,1,0.36,1) both',
        'shimmer':    'shimmer 2.5s linear infinite',
        'pulse-glow': 'pulse-glow 2.2s ease-in-out infinite',
        'radar-ping': 'radar-ping 1.6s cubic-bezier(0,0,0.2,1) infinite',
        'float':      'none',
        'fade-up':    'fade-up 0.26s cubic-bezier(0.22,1,0.36,1) backwards',
        'cyber-line': 'none',
      },
      colors: {
        ink: {
          1: 'var(--text-1)',
          2: 'var(--text-2)',
          3: 'var(--text-3)',
          4: 'var(--text-4)',
        },
        line: {
          DEFAULT: 'var(--border-1)',
          strong:  'var(--border-2)',
        },
        surface: {
          deep:    'var(--bg-deep)',
          base:    'var(--bg-base)',
          card:    'var(--bg-card)',
          DEFAULT: 'var(--bg-surface)',
          subtle:  'var(--surface-subtle)',
          hover:   'var(--surface-hover)',
        },
        pos:  'var(--pos)',
        neg:  'var(--neg)',
        warn: 'var(--warn)',
        info: 'var(--info)',
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
        sans: ['Geist', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'Cascadia Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '9px',
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
