/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Base surfaces
        base: {
          950: 'var(--color-base-950)',
          900: 'var(--color-base-900)',
          800: 'var(--color-base-800)',
          700: 'var(--color-base-700)',
          600: 'var(--color-base-600)',
        },
        // Text
        ink: {
          DEFAULT: 'var(--color-ink)',
          muted: 'var(--color-ink-muted)',
          subtle: 'var(--color-ink-subtle)',
        },
        // Accent — muted electric blue
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          muted: 'var(--color-accent-muted)',
        },
        // Status — used in badges only
        status: {
          available: 'var(--color-status-available)',
          'available-bg': 'var(--color-status-available-bg)',
          ontrip: 'var(--color-status-ontrip)',
          'ontrip-bg': 'var(--color-status-ontrip-bg)',
          inshop: 'var(--color-status-inshop)',
          'inshop-bg': 'var(--color-status-inshop-bg)',
          retired: 'var(--color-status-retired)',
          'retired-bg': 'var(--color-status-retired-bg)',
          offduty: 'var(--color-status-offduty)',
          'offduty-bg': 'var(--color-status-offduty-bg)',
          suspended: 'var(--color-status-suspended)',
          'suspended-bg': 'var(--color-status-suspended-bg)',
          draft: 'var(--color-status-draft)',
          'draft-bg': 'var(--color-status-draft-bg)',
          dispatched: 'var(--color-status-dispatched)',
          'dispatched-bg': 'var(--color-status-dispatched-bg)',
          completed: 'var(--color-status-completed)',
          'completed-bg': 'var(--color-status-completed-bg)',
          cancelled: 'var(--color-status-cancelled)',
          'cancelled-bg': 'var(--color-status-cancelled-bg)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          hover: 'var(--color-danger-hover)',
          muted: 'var(--color-danger-muted)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          muted: 'var(--color-success-muted)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          muted: 'var(--color-warning-muted)',
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
        card: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
        modal: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
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
