/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'media',
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
      colors: {
        // ─── HISPALOSHOP DESIGN SYSTEM v1.0 ─────────────────
        'hs-black':    '#0A0A0A',
        'hs-white':    '#FFFFFF',
        'hs-bg':       '#F5F5F7',
        'hs-surface':  '#FFFFFF',
        'hs-text-1':   '#1D1D1F',
        'hs-text-2':   '#6E6E73',
        'hs-text-3':   '#AEAEB2',
        'hs-green':    '#34C759',
        'hs-orange':   '#FF9500',
        'hs-purple':   '#5856D6',
        'hs-red':      '#FF3B30',
        'hs-blue':     '#007AFF',
        'hs-yellow':   '#FFD60A',
      },
      fontFamily: {
        'apple': [
          '-apple-system', 'BlinkMacSystemFont',
          'SF Pro Display', 'SF Pro Text',
          'Helvetica Neue', 'sans-serif',
        ],
      },
      borderRadius: {
        'hs-sm':   '6px',
        'hs-md':   '10px',
        'hs-lg':   '16px',
        'hs-xl':   '22px',
        'hs-2xl':  '28px',
      },
      boxShadow: {
        'hs-xs': '0 1px 4px rgba(0,0,0,0.05)',
        'hs-sm': '0 2px 10px rgba(0,0,0,0.07)',
        'hs-md': '0 4px 20px rgba(0,0,0,0.09)',
        'hs-lg': '0 8px 36px rgba(0,0,0,0.11)',
        'hs-xl': '0 16px 56px rgba(0,0,0,0.14)',
        'card':       '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
        'card-hover': '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
        'modal':      '0 8px 30px rgba(0,0,0,0.12)',
        'nav':        '0 1px 3px rgba(0,0,0,0.05)',
      },
      transitionTimingFunction: {
        'hs':        'cubic-bezier(0.4, 0, 0.2, 1)',
        'hs-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'topbar':      '52px',
        'bottomnav':   '56px',
        'sidebar':     '240px',
        'content':     '640px',
      },
      animation: {
        'slide-up':        'slideUp 0.3s ease-out',
        'slide-down':      'slideDown 0.3s ease-out',
        'fade-in':         'fadeIn 0.2s ease-out',
        'ripple':          'ripple 0.6s linear',
        'pulse-slow':      'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pop-in':          'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'slide-up-spring': 'slideUpSpring 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'fade-scale-in':   'fadeScaleIn 0.2s cubic-bezier(0, 0, 0.2, 1) both',
        'overlay-in':      'overlayIn 0.2s cubic-bezier(0, 0, 0.2, 1) both',
        'enter-page':      'enterPage 0.35s cubic-bezier(0, 0, 0.2, 1) both',
        'story-pulse':     'storyPulse 2s ease-in-out infinite',
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
        storyPulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
