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
        // VigorousONE brand colours — backed by CSS vars in globals.css.
        brand: {
          navy: 'var(--brand-navy)',
          yellow: 'var(--brand-yellow)',
          green: 'var(--brand-green)',
          'green-dark': 'var(--brand-green-dark)',
          'green-hover': 'var(--brand-green-hover)',
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
