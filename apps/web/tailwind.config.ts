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
      },
      boxShadow: {
        panel: '0 18px 50px rgba(31, 28, 22, 0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config;

