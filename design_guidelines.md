# Hispaloshop Design System - Phase 1

## Applied Design System (February 2026)

### Typography
- **Headings**: Cinzel (serif) - weight 500-600, letter-spacing 0.02em
- **Body/UI**: Inter (sans-serif) - weight 400-500, line-height 1.6

### Color Palette
| Purpose | Color | Hex |
|---------|-------|-----|
| Primary Background | Stone Beige | #F4EFE9 |
| Secondary Background | Light Beige | #FAF7F2 |
| Card Background | White | #FFFFFF |
| Primary Text | Charcoal | #1C1C1C |
| Secondary Text | Dark Gray | #4A4A4A |
| Muted Text | Medium Gray | #7A7A7A |
| Default Border | Warm Gray | #DED7CE |
| Divider | Light Warm Gray | #E6DFD6 |
| Success Accent | Olive | #6B7A4A |
| Danger Accent | Rust | #9C4A3A |

### Button System
- **Primary**: Transparent bg, 1px solid #1C1C1C border, pill radius (999px)
  - Hover: #1C1C1C bg, #F4EFE9 text
- **Secondary**: Transparent bg, 1px solid #DED7CE border, pill radius
  - Hover: border darkens to #1C1C1C
- **Ghost**: No border, text only, subtle hover color change

### Card System
- Border: 1px solid #DED7CE
- Border radius: 8px
- Shadow: 0 4px 12px rgba(0,0,0,0.04) - very subtle
- Padding: 24px (editorial spacing)

### Spacing
- Base unit: 8px
- Section spacing: 64px vertical
- Card padding: 24-32px
- Max content width: 1200px

### Components Updated
1. ✅ `index.css` - Full design system CSS variables
2. ✅ `tailwind.config.js` - Color palette, typography, shadows
3. ✅ `button.jsx` - Pill-shaped, border-based buttons
4. ✅ `input.jsx` - Clean form inputs with subtle focus
5. ✅ `HomePage.js` - Editorial hero, feature cards
6. ✅ `Header.js` - Clean navigation, proper fonts
7. ✅ `Footer.js` - Editorial footer styling
8. ✅ `ProductCard.js` - Subtle product cards
9. ✅ `ProducerLayout.js` - Dashboard sidebar styling

### Design Principles Applied
- ❌ No gradients
- ❌ No bright colors
- ❌ No heavy shadows
- ❌ No SaaS dashboard aesthetics
- ✅ Editorial, magazine-like feel
- ✅ Quiet premium tone
- ✅ Trust-first visual language
