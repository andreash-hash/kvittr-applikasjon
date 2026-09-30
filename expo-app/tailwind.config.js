/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        primary: '#6366F1',
        'primary-foreground': '#FFFFFF',
        background: '#FAF7F2',
        foreground: '#1A1A2E',
        card: '#FFFFFF',
        'card-foreground': '#1A1A2E',
        muted: '#F3F4F6',
        'muted-foreground': '#6B7280',
        border: '#E5E7EB',
        destructive: '#EF4444',
        'destructive-foreground': '#FFFFFF',
        success: '#10B981',
        'category-receipt': '#6366F1',
        'category-return': '#D97706',
        'category-giftcard': '#0D9488',
        'category-expiring': '#EF4444',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
