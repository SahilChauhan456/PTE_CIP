/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark navy design system used across the mockups.
        ink: {
          950: '#0B1220', // page background
          900: '#0E1626',
          800: '#111A2C', // card background
          700: '#16213A',
        },
        line: '#1E2A44', // borders
        accent: {
          DEFAULT: '#2563EB',
          soft: '#3B82F6',
        },
        good: '#22C55E',
        warn: '#F59E0B',
        bad: '#EF4444',
      },
      borderRadius: {
        xl: '0.9rem',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(-50%, -50%)' },
          '50%': { transform: 'translate(-50%, calc(-50% - 12px))' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        'spin-slow': 'spin-slow 60s linear infinite',
      },
    },
  },
  plugins: [],
};
