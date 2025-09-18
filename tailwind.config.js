/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs",
    "./public/**/*.html",
    "./public/js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        'ruxchai': {
          'primary': '#1e40af',     // Blue-700
          'secondary': '#dc2626',   // Red-600
          'accent': '#059669',      // Emerald-600
          'dark': '#1f2937',        // Gray-800
          'light': '#f8fafc',       // Slate-50
          'blue': {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a'
          },
          'red': {
            50: '#fef2f2',
            100: '#fee2e2',
            200: '#fecaca',
            300: '#fca5a5',
            400: '#f87171',
            500: '#ef4444',
            600: '#dc2626',
            700: '#b91c1c',
            800: '#991b1b',
            900: '#7f1d1d'
          },
          'green': {
            50: '#ecfdf5',
            100: '#d1fae5',
            200: '#a7f3d0',
            300: '#6ee7b7',
            400: '#34d399',
            500: '#10b981',
            600: '#059669',
            700: '#047857',
            800: '#065f46',
            900: '#064e3b'
          }
        }
      },
      fontFamily: {
        'thai': ['Sarabun', 'Prompt', 'sans-serif'],
        'sans': ['Inter', 'Sarabun', 'system-ui', 'sans-serif']
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },
      boxShadow: {
        'ruxchai': '0 4px 6px -1px rgba(30, 64, 175, 0.1), 0 2px 4px -1px rgba(30, 64, 175, 0.06)',
        'ruxchai-lg': '0 10px 15px -3px rgba(30, 64, 175, 0.1), 0 4px 6px -2px rgba(30, 64, 175, 0.05)'
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' }
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ],
}