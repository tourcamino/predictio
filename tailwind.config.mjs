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
    },
  },
  plugins: [forms],
};
