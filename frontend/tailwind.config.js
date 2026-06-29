/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#ECFBFF',
          100: '#D4F4FD',
          200: '#ABE8FA',
          300: '#82DCF4',
          400: '#6FD2F0',
          500: '#60CCED',
          600: '#38B0D6',
          700: '#2A8FB0',
          800: '#27758F',
          900: '#265F75',
          950: '#13404F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.06)',
        'sheet': '0 -4px 24px rgba(0,0,0,0.1)',
        'nav': '0 -1px 12px rgba(0,0,0,0.04)',
      },
      animation: {
        'slide-up': 'slideUp 0.25s ease',
        'fade-in': 'fadeIn 0.2s ease',
      },
      keyframes: {
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
