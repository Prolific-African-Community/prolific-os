/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  important: '#__next',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'var(--font-sans)',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
        mono: [
          'var(--font-mono)',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      colors: {
        canvas: '#f5f6f8',
        surface: '#ffffff',
        ink: {
          DEFAULT: '#0b0b10',
          soft: '#41434c',
          muted: '#6b6e7b',
          faint: '#9497a3',
        },
        accent: {
          50: '#eef4ff',
          100: '#dbe6ff',
          200: '#bccfff',
          300: '#8fb0ff',
          400: '#5c86fb',
          500: '#3b6bf4',
          600: '#2451e0',
          700: '#1d40b8',
        },
        line: 'rgba(11, 11, 16, 0.08)',
      },
      borderRadius: {
        xl: '0.85rem',
        '2xl': '1.15rem',
        '3xl': '1.6rem',
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.03)',
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 12px 30px -12px rgba(16, 24, 40, 0.12)',
        lift: '0 4px 8px rgba(16, 24, 40, 0.05), 0 24px 48px -16px rgba(16, 24, 40, 0.18)',
        glow: '0 8px 30px -8px rgba(59, 107, 244, 0.45)',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(circle at 50% 0%, rgba(59,107,244,0.10), transparent 60%)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.4s ease both',
        'pulse-soft': 'pulse-soft 1.8s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
