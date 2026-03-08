/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    screens: {
      'xs': '320px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1440px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        heading: ['Cinzel', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        // New Design System Colors
        'ds': {
          'primary': '#1A1A1A',
          'secondary': '#F5F5F0',
          'accent': '#2D5A27',
          'alert': '#C41E3A',
          'neutral': {
            100: '#FFFFFF',
            200: '#E5E5E5',
            300: '#CCCCCC',
            600: '#666666',
            900: '#1A1A1A',
          },
        },
        // Primary brand colors
        primary: {
          DEFAULT: '#1C1C1C',
          foreground: '#F4EFE9',
          hover: '#2A2A2A',
        },
        // Secondary colors
        secondary: {
          DEFAULT: '#FAF7F2',
          foreground: '#1C1C1C',
          hover: '#F4EFE9',
        },
        // Accent colors (limited use)
        accent: {
          DEFAULT: '#2D5A27',
          foreground: '#FFFFFF',
          olive: '#6B7A4A',
          rust: '#9C4A3A',
          success: '#2D5A27',
        },
        // Background system
        background: {
          DEFAULT: '#F5F5F0',
          paper: '#FFFFFF',
          secondary: '#FAF7F2',
          subtle: '#F4EFE9',
        },
        // Text system
        text: {
          primary: '#1A1A1A',
          secondary: '#4A4A4A',
          muted: '#666666',
          inverted: '#F5F5F0',
        },
        // Border system
        border: {
          DEFAULT: '#E5E5E5',
          divider: '#E6DFD6',
          focus: '#2D5A27',
        },
        // Status colors (muted)
        status: {
          success: '#2D5A27',
          warning: '#B8860B',
          error: '#C41E3A',
          info: '#5A6A7A',
        },
        // Stone palette for backgrounds
        stone: {
          50: '#FAF7F2',
          100: '#F5F5F0',
          200: '#E6DFD6',
          300: '#DED7CE',
          400: '#C4BDB4',
          500: '#9A938A',
          600: '#666666',
          700: '#4A4A4A',
          800: '#2A2A2A',
          900: '#1A1A1A',
        },
      },
      borderRadius: {
        'pill': '999px',
        'xl': '16px',
        'lg': '12px',
        'md': '8px',
        'sm': '4px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.08)',
        'floating': '0 16px 48px rgba(0, 0, 0, 0.12)',
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'sm': '0 2px 4px rgba(0, 0, 0, 0.02)',
        'md': '0 4px 12px rgba(0, 0, 0, 0.04)',
        'lg': '0 8px 24px rgba(0, 0, 0, 0.06)',
        'hover': '0 6px 16px rgba(0, 0, 0, 0.05)',
        'none': 'none',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      letterSpacing: {
        'editorial': '0.02em',
        'label': '0.05em',
      },
      lineHeight: {
        'editorial': '1.6',
      },
      maxWidth: {
        'editorial': '1200px',
      },
      minHeight: {
        'touch': '48px',
        'touch-lg': '56px',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'ripple': 'ripple 0.6s linear',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
      },
      transitionDuration: {
        '200': '200ms',
        '300': '300ms',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
