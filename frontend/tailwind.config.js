module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#18181b',
        secondary: '#27272a',
        accent: '#6366f1',
        card: '#23232b',
        surface: '#18181b',
        border: '#27272a',
        text: '#f3f4f6',
        muted: '#a1a1aa',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
}
