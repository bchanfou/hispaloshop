/**
 * Country detection and configuration for Hispaloshop.
 * Each country sees HSP as its LOCAL artisan food platform.
 */

const COUNTRY_CONFIGS = {
  ES: {
    name_local: 'España',
    flag: '🇪🇸',
    tagline_platform: 'La alimentación artesanal española',
    tagline_sub: 'Descubre productores locales, apoya la economía de tu región',
    language: 'es',
    currency: 'EUR',
    is_active: true,
  },
  FR: {
    name_local: 'France',
    flag: '🇫🇷',
    tagline_platform: "L'alimentation artisanale française",
    tagline_sub: "Découvrez les producteurs locaux, soutenez l'économie de votre région",
    language: 'fr',
    currency: 'EUR',
    is_active: true,
  },
  KR: {
    name_local: '대한민국',
    flag: '🇰🇷',
    tagline_platform: '한국 전통 식품',
    tagline_sub: '지역 생산자를 발견하고 우리 경제를 지원하세요',
    language: 'ko',
    currency: 'KRW',
    is_active: false,
  },
  IT: {
    name_local: 'Italia',
    flag: '🇮🇹',
    tagline_platform: "L'alimentazione artigianale italiana",
    tagline_sub: "Scopri i produttori locali, sostieni l'economia della tua regione",
    language: 'it',
    currency: 'EUR',
    is_active: false,
  },
  PT: {
    name_local: 'Portugal',
    flag: '🇵🇹',
    tagline_platform: 'A alimentação artesanal portuguesa',
    tagline_sub: 'Descobre produtores locais, apoia a economia da tua região',
    language: 'pt',
    currency: 'EUR',
    is_active: false,
  },
  DE: {
    name_local: 'Deutschland',
    flag: '🇩🇪',
    tagline_platform: 'Das handwerkliche Lebensmittelangebot Deutschlands',
    tagline_sub: 'Entdecke lokale Produzenten, stärke die regionale Wirtschaft',
    language: 'de',
    currency: 'EUR',
    is_active: false,
  },
  JP: {
    name_local: '日本',
    flag: '🇯🇵',
    tagline_platform: '日本の職人食品',
    tagline_sub: '地元の生産者を発見し、地域経済を支援しましょう',
    language: 'ja',
    currency: 'JPY',
    is_active: false,
  },
  DEFAULT: {
    name_local: 'Your Country',
    flag: '🌍',
    tagline_platform: 'Local artisan food',
    tagline_sub: 'Discover local producers, support your regional economy',
    language: 'en',
    currency: 'EUR',
    is_active: false,
  },
};

const LANG_TO_COUNTRY = {
  es: 'ES',
  fr: 'FR',
  ko: 'KR',
  it: 'IT',
  pt: 'PT',
  de: 'DE',
  ja: 'JP',
  zh: 'CN',
};

/**
 * Get full config for a country code.
 * Falls back to DEFAULT for unknown codes.
 */
export function getCountryConfig(countryCode) {
  return COUNTRY_CONFIGS[countryCode] || COUNTRY_CONFIGS.DEFAULT;
}

/**
 * Get list of all configured countries (excluding DEFAULT).
 */
export function getAllCountries() {
  return Object.entries(COUNTRY_CONFIGS)
    .filter(([code]) => code !== 'DEFAULT')
    .map(([code, config]) => ({ code, ...config }));
}

/**
 * Get only active countries.
 */
export function getActiveCountries() {
  return getAllCountries().filter(c => c.is_active);
}

/**
 * Detect the user's country by checking (in order):
 * 1. localStorage saved preference
 * 2. User object from auth (country field)
 * 3. Browser language mapping
 * 4. Default: ES
 */
export function detectCountry(user = null) {
  // 1. Saved preference
  const saved = localStorage.getItem('hsp_country');
  if (saved && COUNTRY_CONFIGS[saved]) {
    return _buildResult(saved);
  }

  // 2. User object
  const userCountry = user?.country || user?.country_code;
  if (userCountry && COUNTRY_CONFIGS[userCountry]) {
    return _buildResult(userCountry);
  }

  // 3. Browser language
  const browserLangs = navigator.languages || [navigator.language];
  for (const lang of browserLangs) {
    if (!lang) continue;

    // Check region subtag first (es-MX → MX, pt-BR → BR)
    const parts = lang.split('-');
    if (parts.length >= 2) {
      const region = parts[1].toUpperCase();
      if (COUNTRY_CONFIGS[region]) {
        return _buildResult(region);
      }
    }

    // Then map base language to country
    const baseLang = parts[0].toLowerCase();
    const mapped = LANG_TO_COUNTRY[baseLang];
    if (mapped) {
      return _buildResult(mapped);
    }
  }

  // 4. Default
  return _buildResult('ES');
}

/**
 * Save the user's country preference to localStorage.
 */
export function saveCountryPreference(countryCode) {
  localStorage.setItem('hsp_country', countryCode);
}

function _buildResult(countryCode) {
  const config = getCountryConfig(countryCode);
  return {
    country_code: countryCode,
    country_name_local: config.name_local,
    platform_tagline: config.tagline_platform,
    tagline_sub: config.tagline_sub,
    language_code: config.language,
    flag_emoji: config.flag,
    currency: config.currency,
    is_active: config.is_active,
  };
}
