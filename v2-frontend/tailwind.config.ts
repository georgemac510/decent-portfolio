import type { Config } from 'tailwindcss';

// Keep the v1 visual identity: green canvas, yellow accent buttons.
// We pull these into named tokens so we can use `bg-portfolio-green`
// instead of arbitrary hex codes throughout the app.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        portfolio: {
          green: '#4caf50',       // v1 background
          'green-dark': '#388e3c', // hover / borders
          'green-darker': '#2e7d32',
          yellow: '#ffeb3b',       // v1 button color
          'yellow-dark': '#fbc02d',
          gain: '#22c55e',         // positive PnL (deeper green for contrast on green bg)
          loss: '#ef4444',         // negative PnL
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
