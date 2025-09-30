/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Simplified color palette - keeping only essential colors
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        // Minimal status colors - Subtle but clear
        green: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          700: '#15803d',
          800: '#166534',
        },
        yellow: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          700: '#b45309',
          800: '#92400e',
        },
        red: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      // Simplified spacing system
      spacing: {
        '18': '4.5rem',
      },
      // Simplified animations
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
      },
      // Consistent border radius
      borderRadius: {
        'DEFAULT': '0.375rem', // 6px
        'md': '0.5rem',        // 8px
        'lg': '0.75rem',       // 12px
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [],
}