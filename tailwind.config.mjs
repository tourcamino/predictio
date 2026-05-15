import forms from "@tailwindcss/forms";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./index.html"],
  theme: {
    extend: {
      colors: {
        'brand-bg': '#080B11',
        'brand-navy': '#0D1421',
        'brand-green': '#00FF87',
        'brand-cyan': '#00D4FF',
      },
      fontFamily: {
        'syne': ['Syne', 'sans-serif'],
        'mono': ['DM Mono', 'monospace'],
        'sans': ['Plus Jakarta Sans', 'sans-serif'],
      },
      transitionDuration: {
        '1200': '1200ms',
      },
      keyframes: {
        'hero-glow': {
          '0%, 100%': { opacity: '0.28' },
          '50%': { opacity: '0.42' },
        },
        'hero-drift': {
          '0%, 100%': { transform: 'translate(-50%, 0) scale(1)' },
          '50%': { transform: 'translate(-49%, -1%) scale(1.02)' },
        },
      },
      animation: {
        'hero-glow': 'hero-glow 22s ease-in-out infinite',
        'hero-drift': 'hero-drift 28s ease-in-out infinite',
      },
    },
  },
  plugins: [forms],
};
