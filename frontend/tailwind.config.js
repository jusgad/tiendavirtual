/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './checkout.html', './admin.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"DM Serif Display"', 'serif'],
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Day palette
        peach: {
          50: '#FFF3DE',
          100: '#FFD79A',
          400: '#FF9E4D',
          500: '#FF8A3D',
          600: '#FF6A1F',
          700: '#FF7A2F',
        },
        // Night palette
        night: {
          900: '#140E38',
          800: '#241653',
          700: '#3A2378',
          600: '#4A2C90',
          violet: '#7C5CE0',
          lilac: '#B98CFF',
        },
      },
      keyframes: {
        twinkle: {
          '0%,100%': { opacity: '.15', transform: 'scale(.7)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
        sunPulse: {
          '0%,100%': { transform: 'rotate(var(--r)) scaleY(1)' },
          '50%': { transform: 'rotate(var(--r)) scaleY(1.35)' },
        },
        sunGlow: {
          '0%,100%': { boxShadow: '0 0 34px rgba(255,180,60,.55)' },
          '50%': { boxShadow: '0 0 52px rgba(255,180,60,.85)' },
        },
        breathe: {
          '0%,100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.035)' },
        },
        floatZ: {
          '0%': { opacity: '0', transform: 'translateY(4px) scale(.8)' },
          '30%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(-16px) scale(1.1)' },
        },
        drift: {
          '0%': { transform: 'translateX(-10px)' },
          '100%': { transform: 'translateX(24px)' },
        },
        ringPulse: {
          '0%': { transform: 'scale(1)', opacity: '.55' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        toastIn: {
          '0%': { opacity: '0', transform: 'translate(-50%,20px)' },
          '100%': { opacity: '1', transform: 'translate(-50%,0)' },
        },
        bobArrow: {
          '0%,100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(6px)' },
        },
      },
      animation: {
        sunGlow: 'sunGlow 3.2s ease-in-out infinite',
        breathe: 'breathe 4s ease-in-out infinite',
        ringPulse: 'ringPulse 1.8s ease-out infinite',
        toastIn: 'toastIn .35s ease',
        bobArrow: 'bobArrow 1.1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
