import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic theme tokens — backed by CSS custom properties in globals.css,
        // so they switch automatically between light and dark. Prefer these over
        // hardcoded hexes everywhere in the institution-facing app.
        app: 'var(--app-bg)',
        sidebar: 'var(--sidebar-bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
        },
        line: 'var(--border)',
        ink: 'var(--text-primary)',
        muted: 'var(--text-secondary)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          violet: 'var(--accent-violet)',
          soft: 'var(--accent-soft)',
          on: 'var(--accent-on)',
        },
        risk: {
          high: 'var(--risk-high)',
          med: 'var(--risk-med)',
          low: 'var(--risk-low)',
        },
        brand: {
          navy: '#0f2447',
          'navy-mid': '#1a3a6e',
          indigo: '#4f46e5',
        },
      },
      animation: {
        'bounce-dot': 'bounceDot 1.4s ease-in-out infinite',
      },
      keyframes: {
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
