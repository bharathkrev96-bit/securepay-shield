/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#080C16',
          panel: '#101828',
          panel2: '#151F33',
          border: '#22304A',
        },
        signal: {
          safe: '#2DD4BF',
          watch: '#F5B942',
          risk: '#F0673A',
          block: '#E5484D',
          cyan: '#22D3EE',
        },
        ink50: '#E8ECF6',
        ink300: '#96A3C4',
        ink500: '#5C6A8C',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34,211,238,0.15), 0 0 24px rgba(34,211,238,0.10)',
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '32px 32px',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.9)', opacity: '0.6' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        scan: 'scan 2.4s ease-in-out infinite',
        pulseRing: 'pulseRing 1.8s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [],
}
