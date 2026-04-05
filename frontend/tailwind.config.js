/** @type {import('tailwindcss').Config} */

// ═══════════════════════════════════════════════════════════════════════════
// HISPALOSHOP — Tailwind Config
// ---------------------------------------------------------------------------
// Ground truth: DESIGN_SYSTEM.md (repo root).
//
// Principios:
// - Palette: stone B&W (stone-50 → stone-950). Zero color accents.
// - Tailwind ya provee toda la escala stone por defecto: NO se redefine aquí.
// - Este archivo solo extiende con tokens de marca que Tailwind no trae.
// - Excepciones al palette están documentadas en DESIGN_SYSTEM.md (IAs,
//   brand illustrations, theme-superadmin). No añadir colores aquí para
//   esas excepciones: viven en sus archivos propios.
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'media',
  theme: {
    // ── Breakpoints ──────────────────────────────────────────────────────────
    // Seguimos los defaults Tailwind + xs para móviles pequeños (<320px = raro)
    screens: {
      'xs': '320px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1440px',
      '2xl': '1536px',
    },

    extend: {
      // ── Typography ─────────────────────────────────────────────────────────
      // font-apple: stack Apple-system (default UI). Se usa en pages chat,
      // auth y layouts principales para consistencia visual tipo iOS.
      fontFamily: {
        'apple': [
          '-apple-system', 'BlinkMacSystemFont',
          'SF Pro Display', 'SF Pro Text',
          'Helvetica Neue', 'sans-serif',
        ],
      },

      // ── Shadows ────────────────────────────────────────────────────────────
      // Sombras Apple-style: sutiles, neutrales, sin tintes de color.
      // Solo las que se usan en código se mantienen (shadow-modal/nav).
      boxShadow: {
        'modal': '0 8px 30px rgba(0,0,0,0.12)',
        'nav':   '0 1px 3px rgba(0,0,0,0.05)',
      },

      // ── Spacing tokens ─────────────────────────────────────────────────────
      // Safe area (iOS PWA) + tokens para topbar/bottomnav/sidebar consistentes.
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
      },

      // ── Animations ─────────────────────────────────────────────────────────
      // Catálogo mínimo. Framer Motion se usa para casi todo; estas
      // animaciones CSS-only son para componentes sin estado JS.
      animation: {
        'ripple':     'ripple 0.6s linear',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        ripple: {
          '0%':   { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
