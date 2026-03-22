/**
 * Helper functions for Hispaloshop
 */

/**
 * Escape HTML entities to prevent XSS when rendering user content.
 * Use this instead of dangerouslySetInnerHTML for user-generated text.
 */
export function sanitizeHTML(html: string | null | undefined): string {
  if (!html) return '';
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML; // Escapes all HTML entities
}

/**
 * Sanitize image URLs and normalize known asset patterns.
 */
export const sanitizeImageUrl = (url: any): string | null => {
  if (!url || typeof url !== 'string') return null;

  let normalized = url.trim();
  if (!normalized) return null;

  // Block javascript: and data: (except images) protocol URLs to prevent XSS
  if (/^javascript:/i.test(normalized)) return null;
  if (/^data:(?!image\/)/i.test(normalized)) return null;

  if (normalized.startsWith('data:image/')) return normalized;

  const embeddedAbsolute = normalized.match(/(https?:\/\/[^\s"'<>]+)/i);
  if (
    embeddedAbsolute &&
    !normalized.startsWith('http://') &&
    !normalized.startsWith('https://')
  ) {
    normalized = embeddedAbsolute[1];
  }

  if (normalized.startsWith('https//')) normalized = `https://${normalized.slice(7)}`;
  if (normalized.startsWith('http//')) normalized = `http://${normalized.slice(6)}`;
  if (/^res\.cloudinary\.com\//i.test(normalized)) normalized = `https://${normalized}`;

  if (normalized.startsWith('//')) return `https:${normalized}`;
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
  if (normalized.startsWith('/api/uploads/')) return normalized;
  if (normalized.startsWith('/uploads/')) return `/api${normalized}`;
  if (normalized.startsWith('uploads/')) return `/api/${normalized}`;
  if (normalized.startsWith('/images/')) return normalized;
  if (normalized.startsWith('images/')) return `/${normalized}`;

  return normalized;
};

// Country code to flag emoji mapping
export const getCountryFlag = (countryCode: string): string => {
  const countryFlags: Record<string, string> = {
    ES: '\u{1F1EA}\u{1F1F8}',
    FR: '\u{1F1EB}\u{1F1F7}',
    DE: '\u{1F1E9}\u{1F1EA}',
    IT: '\u{1F1EE}\u{1F1F9}',
    PT: '\u{1F1F5}\u{1F1F9}',
    US: '\u{1F1FA}\u{1F1F8}',
    GB: '\u{1F1EC}\u{1F1E7}',
    MX: '\u{1F1F2}\u{1F1FD}',
    MA: '\u{1F1F2}\u{1F1E6}',
    GR: '\u{1F1EC}\u{1F1F7}',
    TR: '\u{1F1F9}\u{1F1F7}',
    EG: '\u{1F1EA}\u{1F1EC}',
    TN: '\u{1F1F9}\u{1F1F3}',
    JP: '\u{1F1EF}\u{1F1F5}',
    CN: '\u{1F1E8}\u{1F1F3}',
    IN: '\u{1F1EE}\u{1F1F3}',
    BR: '\u{1F1E7}\u{1F1F7}',
    AR: '\u{1F1E6}\u{1F1F7}',
    CL: '\u{1F1E8}\u{1F1F1}',
    PE: '\u{1F1F5}\u{1F1EA}',
    AU: '\u{1F1E6}\u{1F1FA}',
    NZ: '\u{1F1F3}\u{1F1FF}',
  };

  return countryFlags[countryCode] || '\u{1F30D}';
};

// Ingredient to emoji mapping
export const getIngredientEmoji = (ingredient: string): string => {
  const normalizedIngredient = ingredient.toLowerCase().trim();

  const emojiMap: Record<string, string> = {
    'olive oil': '\u{1FAD2}',
    oil: '\u{1FAD2}',
    'sunflower oil': '\u{1F33B}',
    'coconut oil': '\u{1F965}',
    rosemary: '\u{1F33F}',
    thyme: '\u{1F33F}',
    basil: '\u{1F33F}',
    oregano: '\u{1F33F}',
    parsley: '\u{1F33F}',
    mint: '\u{1F33F}',
    sage: '\u{1F33F}',
    'bay leaf': '\u{1F343}',
    pepper: '\u{1F336}\u{FE0F}',
    chili: '\u{1F336}\u{FE0F}',
    paprika: '\u{1F336}\u{FE0F}',
    garlic: '\u{1F9C4}',
    onion: '\u{1F9C5}',
    salt: '\u{1F9C2}',
    'sea salt': '\u{1F9C2}',
    almond: '\u{1F330}',
    walnut: '\u{1F330}',
    hazelnut: '\u{1F330}',
    pistachio: '\u{1F95C}',
    peanut: '\u{1F95C}',
    sesame: '\u{1F33E}',
    lemon: '\u{1F34B}',
    orange: '\u{1F34A}',
    apple: '\u{1F34E}',
    tomato: '\u{1F345}',
    olive: '\u{1FAD2}',
    grape: '\u{1F347}',
    fig: '\u{1F330}',
    date: '\u{1F334}',
    wheat: '\u{1F33E}',
    flour: '\u{1F33E}',
    rice: '\u{1F35A}',
    corn: '\u{1F33D}',
    oat: '\u{1F33E}',
    barley: '\u{1F33E}',
    milk: '\u{1F95B}',
    cheese: '\u{1F9C0}',
    butter: '\u{1F9C8}',
    cream: '\u{1F95B}',
    honey: '\u{1F36F}',
    sugar: '\u{1F36C}',
    carrot: '\u{1F955}',
    potato: '\u{1F954}',
    cucumber: '\u{1F952}',
    eggplant: '\u{1F346}',
    'bell pepper': '\u{1FAD1}',
    spinach: '\u{1F96C}',
    egg: '\u{1F95A}',
    chicken: '\u{1F357}',
    beef: '\u{1F969}',
    fish: '\u{1F41F}',
    tuna: '\u{1F41F}',
    salmon: '\u{1F41F}',
    shrimp: '\u{1F990}',
    vinegar: '\u{1F9F4}',
    wine: '\u{1F377}',
    yeast: '\u{1F35E}',
    water: '\u{1F4A7}',
  };

  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (normalizedIngredient.includes(key)) {
      return emoji;
    }
  }

  return '\u{1F958}';
};

/**
 * Abbreviate large numbers: 1000→1K, 1200→1.2K, 1000000→1M
 */
export const abbreviateCount = (n: number | null | undefined): string => {
  if (n == null) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};
