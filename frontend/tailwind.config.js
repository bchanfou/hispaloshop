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
        sans:    ['Inter', 'sans-serif'],
        heading: ['Playfair Display', 'serif'],
        body:    ['Inter', 'sans-serif'],
        apple:   ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Helvetica Neue', 'sans-serif'],
      },
      colors: {
        // ─── APPLE DESIGN SYSTEM ──────────────────────────────────────
        'hs-black':  '#0A0A0A',
        'hs-white':  '#FFFFFF',
        'hs-bg':     '#F5F5F7',
        'hs-text':   '#1D1D1F',
        'hs-muted':  '#6E6E73',
        'hs-green':  '#34C759',
        'hs-orange': '#FF9500',
        'hs-purple': '#5856D6',
        'hs-blue':   '#007AFF',
        'hs-red':    '#FF3B30',

        // ─── HISPALOSHOP LEGACY ───────────────────────────────────────
        brand: {
          red:          '#C83A2A',
          'red-hover':  '#B23324',
          olive:        '#4F7A53',
          'olive-hover':'#3F6243',
          terracotta:   '#E07A5F',
        },

        // Gray scale (DS)
        gray: {
          100: '#F7F7F7',
          200: '#EAEAEA',
          300: '#D2D2D2',
          500: '#7A7A7A',
          700: '#4A4A4A',
          900: '#1A1A1A',
        },

        // Dark (DS)
        dark: {
          graphite: '#1C1C1E',
          bg:       '#0F0F10',
        },

        // State (DS)
        state: {
          success: '#2E9B5D',
          warning: '#F4A261',
          amber:   '#E6A532',
          error:   '#E63946',
          info:    '#3A86FF',
        },

        // ─── LEGACY (backward compat) ──────────────────────────────────
        // Primary brand colors
        primary: {
          DEFAULT:    '#1C1C1C',
          foreground: '#F4EFE9',
          hover:      '#2A2A2A',
        },
        // Secondary colors
        secondary: {
          DEFAULT:    '#FAF7F2',
          foreground: '#1C1C1C',
          hover:      '#F4EFE9',
        },
        // Accent colors
        accent: {
          DEFAULT:  '#2D5A27',
          foreground: '#FFFFFF',
          olive:    '#6B7A4A',
          rust:     '#9C4A3A',
          success:  '#2D5A27',
        },
        // Background system
        background: {
          DEFAULT:   '#F3EFEA',
          paper:     '#FFFFFF',
          secondary: '#FAF7F2',
          subtle:    '#F4EFE9',
          dark:      '#0F0F10',
        },
        // Text system
        text: {
          primary:   '#1A1A1A',
          secondary: '#4A4A4A',
          muted:     '#7A7A7A',
          inverted:  '#F5F5F0',
        },
        // Border system
        border: {
          DEFAULT: '#D2D2D2',
          divider: '#EAEAEA',
          focus:   '#C83A2A',
        },
        // Status colors
        status: {
          success: '#2E9B5D',
          warning: '#F4A261',
          error:   '#E63946',
          info:    '#3A86FF',
        },
        // Stone palette
        stone: {
          50:  '#FAF7F2',
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
        // DS namespace (legacy)
        'ds': {
          'primary':   '#1A1A1A',
          'secondary': '#F5F5F0',
          'accent':    '#2D5A27',
          'alert':     '#C41E3A',
          'neutral': {
            100: '#FFFFFF',
            200: '#E5E5E5',
            300: '#CCCCCC',
            600: '#666666',
            900: '#1A1A1A',
          },
        },
      },

      borderRadius: {
        'pill':      '999px',
        'avatar':    '9999px',
        'apple-sm':  '8px',
        'apple-md':  '12px',
        'apple-lg':  '18px',
        'apple-xl':  '24px',
        '2xl':       '20px',
        'xl':        '16px',
        'lg':        '12px',
        'md':        '8px',
        'sm':        '6px',
        'xs':        '4px',
      },

      boxShadow: {
        // Apple shadows
        'apple-sm': '0 1px 8px rgba(0,0,0,0.06)',
        'apple-md': '0 2px 20px rgba(0,0,0,0.08)',
        'apple-lg': '0 8px 40px rgba(0,0,0,0.10)',
        // DS shadows
        'card':  '0 4px 12px rgba(0,0,0,0.08)',
        'hover': '0 8px 24px rgba(0,0,0,0.12)',
        'modal': '0 20px 40px rgba(0,0,0,0.18)',
        // Legacy
        'card-hover': '0 8px 24px rgba(0,0,0,0.08)',
        'floating':   '0 16px 48px rgba(0,0,0,0.12)',
        'soft':       '0 2px 8px rgba(0,0,0,0.04)',
        'sm':         '0 2px 4px rgba(0,0,0,0.02)',
        'md':         '0 4px 12px rgba(0,0,0,0.04)',
        'lg':         '0 8px 24px rgba(0,0,0,0.06)',
        'none':       'none',
      },

      spacing: {
        // DS spacing scale
        'ds-xs':   '4px',
        'ds-sm':   '8px',
        'ds-md':   '16px',
        'ds-lg':   '24px',
        'ds-xl':   '32px',
        'ds-xxl':  '48px',
        'ds-xxxl': '64px',
        // Legacy
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },

      letterSpacing: {
        'editorial': '0.02em',
        'label':     '0.05em',
      },

      lineHeight: {
        'editorial': '1.6',
        'heading-1': '56px',
        'heading-2': '1.2',
        'heading-3': '1.3',
      },

      fontSize: {
        // DS typography scale
        'h1':      ['48px', { lineHeight: '56px',  fontWeight: '700' }],
        'h2':      ['36px', { lineHeight: '1.2',   fontWeight: '700' }],
        'h3':      ['28px', { lineHeight: '1.3',   fontWeight: '600' }],
        'h4':      ['22px', { lineHeight: '1.4',   fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.6',   fontWeight: '400' }],
        'body':    ['16px', { lineHeight: '1.6',   fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.5',   fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '1.4',   fontWeight: '400' }],
        'btn':     ['16px', { lineHeight: '1',     fontWeight: '500' }],
      },

      maxWidth: {
        'editorial': '1200px',
        'content':   '800px',
      },

      minHeight: {
        'touch':    '48px',
        'touch-lg': '56px',
      },

      animation: {
        'slide-up':        'slideUp 0.3s ease-out',
        'slide-down':      'slideDown 0.3s ease-out',
        'fade-in':         'fadeIn 0.2s ease-out',
        'ripple':          'ripple 0.6s linear',
        'pulse-slow':      'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        // Motion system — spring-based
        'pop-in':          'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'slide-up-spring': 'slideUpSpring 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'fade-scale-in':   'fadeScaleIn 0.2s cubic-bezier(0, 0, 0.2, 1) both',
        'overlay-in':      'overlayIn 0.2s cubic-bezier(0, 0, 0.2, 1) both',
        'enter-page':      'enterPage 0.35s cubic-bezier(0, 0, 0.2, 1) both',
      },

      keyframes: {
        slideUp: {
          '0%':   { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        slideDown: {
          '0%':   { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        ripple: {
          '0%':   { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        // Motion system keyframes
        popIn: {
          '0%':   { opacity: '0', transform: 'scale(0.94) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        slideUpSpring: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeScaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        overlayIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        enterPage: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
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
