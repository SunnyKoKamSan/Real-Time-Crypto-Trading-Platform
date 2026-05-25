import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#171717',
        paper: '#f7f5ef',
        line: '#d8d2c3',
        copper: '#b76e38',
        mint: '#1d8b6a',
        signal: '#276ef1',
        ops: '#0b1019',
        panel: '#111827',
      },
      boxShadow: {
        panel: '0 18px 50px rgba(31, 28, 22, 0.12)',
        console: '0 20px 60px rgba(0, 0, 0, 0.28)',
      },
    },
  },
  plugins: [],
} satisfies Config;
