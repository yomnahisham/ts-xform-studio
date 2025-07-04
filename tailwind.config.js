module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8fafc',
        text: '#18181b',
        accent: '#2563eb',
        card: '#fff',
        border: '#e5e7eb',
        gray: '#6b7280',
      },
      fontSize: {
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
      },
      borderRadius: {
        lg: '1rem',
      },
      boxShadow: {
        card: '0 2px 12px 0 rgba(16,30,54,0.06)',
      },
    },
  },
  plugins: [],
}; 