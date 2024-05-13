/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        alert: {
          'from': {
            opacity: 0,
            transform: 'translateX(-100%)'
          },
          'to': {
            opacity: 1,
            transform: 'translateX(0)'
          }
        },
        nprogress: {
          from: {
            transform: 'translateX(-100%)'
          },
          to: {
            transform: 'translateX(100%)'
          }
        },
      },
      animation: {
        alert: 'alert 0.5s ease-in-out',
        nprogress: 'nprogress 1.5s ease-out infinite'
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
