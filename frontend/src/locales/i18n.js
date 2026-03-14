import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { translations, defaultLanguage, supportedLanguages } from './index';

// Create resources object from translations
const resources = {};
supportedLanguages.forEach(lang => {
  resources[lang] = { translation: translations[lang] };
});

// Detect browser/device language
const detectBrowserLanguage = () => {
  // Try navigator.language first (most specific)
  const navLang = navigator.language?.split?.('-')?.[0]?.toLowerCase?.();
  if (navLang && supportedLanguages.includes(navLang)) {
    return navLang;
  }
  
  // Try navigator.languages array (user's preferred languages)
  if (navigator.languages && navigator.languages.length > 0) {
    for (const lang of navigator.languages) {
      const shortLang = lang.split('-')[0].toLowerCase();
      if (supportedLanguages.includes(shortLang)) {
        return shortLang;
      }
    }
  }
  
  // Fallback to English if device language is not supported
  return 'en';
};

// Get saved language from localStorage or detect from browser
const getSavedLanguage = () => {
  // First check localStorage
  const saved = localStorage.getItem('hispaloshop_language');
  if (saved && supportedLanguages.includes(saved)) {
    return saved;
  }
  
  // No saved preference - detect from device
  const detected = detectBrowserLanguage();
  // Save the detected language so we don't re-detect every time
  localStorage.setItem('hispaloshop_language', detected);
  return detected;
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getSavedLanguage(),
    fallbackLng: defaultLanguage,
    interpolation: {
      escapeValue: false // React already does escaping
    },
    react: {
      useSuspense: false
    }
  });

// Listen for language changes and save to localStorage
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('hispaloshop_language', lng);
  // Update document direction for RTL languages
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

// Set initial direction
document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
document.documentElement.lang = i18n.language;

export default i18n;
