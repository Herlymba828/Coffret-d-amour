/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFF8F0',
        'powder-rose': '#FADADD',
        'copper-gold': '#C9A87C',
        'deep-rose': '#E8A0BF',
        'candle-bg': '#1A1410',
        'candle-text': '#C9A87C',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        soft: '0 4px 20px rgba(201, 168, 124, 0.15)',
      },
    },
  },
  plugins: [],
};
