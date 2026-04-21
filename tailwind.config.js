/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0A1628',
        burgundy: '#7B1E2E',
        mustard: '#F5B301',
        'sigam-bg': '#FAFAF7',
        'sigam-card': '#FFFFFF',
        'sigam-border': '#E5E5E0',
        'sigam-text': '#1A1A1A',
        'sigam-muted': '#666666',
        'state-ok': '#10B981',
        'state-pendiente': '#F5B301',
        'state-discrepancia': '#7B1E2E',
        'state-resuelta': '#0A1628',
      },
      fontFamily: {
        headline: ['"DM Serif Display"', 'serif'],
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
