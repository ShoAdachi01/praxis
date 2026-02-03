/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Zen color palette
        'stone-bg': '#f5f3ef',      // warm background
        'moss-bg': '#f4f6f4',       // ultra-minimal variant
        'moss': '#7d8c75',          // muted green accent
        'ink': '#3d3d3d',           // all text
        'wood': '#a68b6a',          // secondary accent
        'mist': '#e8e6e1',          // subtle dividers

        // Personal vs shared space distinction
        'self': '#f5f3ef',          // personal space - warm
        'shared': '#f8f9fa',        // shared space - cooler, slightly brighter
      },
      fontFamily: {
        'sans': ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        'serif': ['Cormorant Garamond', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-out': 'fadeOut 0.5s ease-out',
        'breathe': 'breathe 4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}
