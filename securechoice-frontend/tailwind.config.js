/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Public Sans', 'Noto Sans', 'sans-serif'],
      },
      colors: {
        // Light mode colors
        primary: '#1993e5',
        secondary: '#0e161b',
        accent: '#4e7a97',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        // Dark mode colors
        dark: {
          bg: '#0f172a',
          surface: '#1e293b',
          border: '#334155',
          text: '#f1f5f9',
          muted: '#94a3b8',
        }
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
} 