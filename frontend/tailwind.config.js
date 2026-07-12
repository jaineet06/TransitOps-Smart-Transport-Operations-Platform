/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Base surfaces
        base: {
          950: '#0E1117',
          900: '#161B27',
          800: '#1C2235',
          700: '#252D3D',
          600: '#2E3A50',
        },
        // Text
        ink: {
          DEFAULT: '#E8EDF5',
          muted: '#7B8FAD',
          subtle: '#4E607A',
        },
        // Accent — muted electric blue
        accent: {
          DEFAULT: '#5B8DEF',
          hover: '#7AA3F3',
          muted: '#2A3F6B',
        },
        // Status — used in badges only
        status: {
          available: '#2ABF6F',
          'available-bg': '#0D2B1E',
          ontrip: '#5B8DEF',
          'ontrip-bg': '#0F1F3D',
          inshop: '#EAA220',
          'inshop-bg': '#2C2006',
          retired: '#4E607A',
          'retired-bg': '#1A2232',
          offduty: '#EAA220',
          'offduty-bg': '#2C2006',
          suspended: '#E0504A',
          'suspended-bg': '#2B0E0D',
          draft: '#7B8FAD',
          'draft-bg': '#1A2232',
          dispatched: '#5B8DEF',
          'dispatched-bg': '#0F1F3D',
          completed: '#2ABF6F',
          'completed-bg': '#0D2B1E',
          cancelled: '#E0504A',
          'cancelled-bg': '#2B0E0D',
        },
        danger: {
          DEFAULT: '#E0504A',
          hover: '#E8706B',
          muted: '#2B0E0D',
        },
        success: {
          DEFAULT: '#2ABF6F',
          muted: '#0D2B1E',
        },
        warning: {
          DEFAULT: '#EAA220',
          muted: '#2C2006',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      spacing: {
        18: '4.5rem',
        72: '18rem',
        80: '20rem',
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.4)',
        modal: '0 20px 60px rgba(0,0,0,0.7)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s infinite linear',
        fadeIn: 'fadeIn 0.15s ease-out',
        slideInRight: 'slideInRight 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
