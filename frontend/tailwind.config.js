/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      
      keyframes: {
        slideLeft: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        slideRight: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        spinnerRing: {
          '0%': { strokeDasharray: '0 257 0 0 1 0 0 258' },
          '25%': { strokeDasharray: '0 0 0 0 257 0 258 0' },
          '50%, 100%': { strokeDasharray: '0 0 0 0 0 515 0 0' }
        },
        spinnerBall: {
          '0%, 50%': { strokeDashoffset: '1' },
          '64%': { strokeDashoffset: '-109' },
          '78%': { strokeDashoffset: '-145' },
          '92%': { strokeDashoffset: '-157' },
          '57%, 71%, 85%, 99%, 100%': { strokeDashoffset: '-163' }
        },
        fadeIn:{
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeOut:{
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-20px)' }
        },
        shrinkFromRight:{
          '0%': { width: '100%' },
          '100%': { width: '0' }
        }
      },
      animation: {
        'slide-left': 'slideLeft 0.7s ease-in-out',
        'slide-right': 'slideRight 0.7s ease-in-out',
        'slide-down': 'slideDown 1s ease-out forwards',
        'spinner-ring': 'spinnerRing 2s ease-out infinite',
        'spinner-ball': 'spinnerBall 2s ease-out infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-out': 'fadeOut 0.5s ease-in-out',
        'shrink-from-right': 'shrinkFromRight var(--duration) linear forwards'
      },
      gridAutoRows: {
        'min': 'minmax(0, 1fr)'
      }
    }
  },
  plugins: [
    require('tailwindcss-animated'),
    require('tailwind-scrollbar')
  ],
  variants: {
    extend: {
      scrollbar: ['dark', 'rounded']
    }
  }
};
