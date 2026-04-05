// ═══════════════════════════════════════════════════════════════════════════
// V1 launch scope: ES + KR + US only.
//
// Other 57 language files remain on disk (locales/*.json) for future activation
// when new markets are launched. Do NOT add them here without scope decision —
// each language adds ~100-400 KB to the initial bundle.
//
// When a new market opens, activating a language is trivial:
//   1. `import pt from './pt.json';`
//   2. Add `pt` to `translations`, `supportedLanguages`
//   3. (Optional) Add to `RTL_LANGUAGES` if right-to-left
//
// Per HispaloShop DNA, default language is `es` (primary hispano market).
// ═══════════════════════════════════════════════════════════════════════════

import es from './es.json';
import ko from './ko.json';
import en from './en.json';

export const translations = { es, ko, en };

export const defaultLanguage = 'es';

export const RTL_LANGUAGES = [];

export const supportedLanguages = ['es', 'ko', 'en'];
