import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { translations, defaultLanguage, supportedLanguages } from '../locales';
import { convertPrice, formatCurrency, getExchangeRate } from '../utils/currency';
import apiClient from '../services/api/client';
import i18n from '../locales/i18n';

const LocaleContext = createContext();

const FALLBACK_COUNTRIES = {
  ES: { name: 'España', flag: '🇪🇸', currency: 'EUR' },
  US: { name: 'United States', flag: '🇺🇸', currency: 'USD' },
  KR: { name: 'South Korea', flag: '🇰🇷', currency: 'KRW' },
  GB: { name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP' },
};

const FALLBACK_LANGUAGES = {
  es: { name: 'Spanish', native: 'Español' },
  en: { name: 'English', native: 'English' },
  ko: { name: 'Korean', native: '한국어' },
};

const FALLBACK_CURRENCIES = {
  EUR: { symbol: '€', name: 'Euro' },
  USD: { symbol: '$', name: 'US Dollar' },
  KRW: { symbol: '₩', name: 'Korean Won' },
  GBP: { symbol: '£', name: 'British Pound' },
};

export function LocaleProvider({ children }) {
  const { user } = useAuth();
  
  // Locale state - Initialize from localStorage for guests
  const [country, setCountry] = useState(() => {
    const saved = localStorage.getItem('hispaloshop_country');
    return saved || 'ES';
  });
  // Sync initial language with i18n instance to avoid race condition
  const [language, setLanguage] = useState(() => i18n.language || defaultLanguage);
  const [currency, setCurrency] = useState(() => {
    const saved = localStorage.getItem('hispaloshop_currency');
    return saved || 'EUR';
  });
  
  // Locale configuration from backend
  const [countries, setCountries] = useState({});
  const [languages, setLanguages] = useState({});
  const [currencies, setCurrencies] = useState({});
  
  // Exchange rates
  const [exchangeRates, setExchangeRates] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  
  const [loading, setLoading] = useState(true);

  // Fetch locale configuration on mount
  useEffect(() => {
    fetchLocaleConfig();
    fetchExchangeRates();
    // Keep LocaleContext in sync if i18n language changes externally
    const handleLangChange = (lng) => {
      setLanguage(lng);
    };
    i18n.on('languageChanged', handleLangChange);
    return () => i18n.off('languageChanged', handleLangChange);
  }, []);

  // Fetch user's saved locale preferences when logged in
  useEffect(() => {
    if (user) {
      fetchUserLocale();
    } else {
      // Auto-detect from browser for guests and load from localStorage
      const savedLanguage = localStorage.getItem('hispaloshop_language');
      if (savedLanguage) {
        setLanguage(savedLanguage);
      } else {
        autoDetectLocale();
      }
    }
  }, [user]);

  const fetchLocaleConfig = async () => {
    try {
      const config = await apiClient.get('/config/locale');
      const configCountries = config?.countries && typeof config.countries === 'object' ? config.countries : {};
      const configLanguages = config?.languages && typeof config.languages === 'object' ? config.languages : {};
      const configCurrencies = config?.currencies && typeof config.currencies === 'object' ? config.currencies : {};
      
      setCountries({ ...FALLBACK_COUNTRIES, ...configCountries });
      setLanguages({ ...FALLBACK_LANGUAGES, ...configLanguages });
      setCurrencies({ ...FALLBACK_CURRENCIES, ...configCurrencies });
      
      // For guests: Check localStorage first, then use config defaults
      const savedCountry = localStorage.getItem('hispaloshop_country');
      const savedCurrency = localStorage.getItem('hispaloshop_currency');
      
      if (!savedCountry) {
        // No saved country, use config default
        setCountry(config.default_country || 'ES');
      }
      if (!savedCurrency) {
        // No saved currency, use config default
        setCurrency(config.default_currency || 'EUR');
      }
      
      // For language: Check saved first, then keep current (which may be auto-detected)
      const savedLang = localStorage.getItem('hispaloshop_language');
      if (savedLang && Object.keys({ ...FALLBACK_LANGUAGES, ...configLanguages }).includes(savedLang)) {
        setLanguage(savedLang);
        if (i18n.language !== savedLang) {
          i18n.changeLanguage(savedLang);
        }
      }
      // If no saved language, the auto-detect from i18n.js or autoDetectLocale will handle it
      
    } catch (error) {

      // Fallback locale config so selectors always work even if backend config endpoint fails.
      setCountries(FALLBACK_COUNTRIES);
      setLanguages(FALLBACK_LANGUAGES);
      setCurrencies(FALLBACK_CURRENCIES);

      const savedCountry = localStorage.getItem('hispaloshop_country');
      const savedCurrency = localStorage.getItem('hispaloshop_currency');
      if (!savedCountry) setCountry('ES');
      if (!savedCurrency) setCurrency('EUR');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLocale = async () => {
    try {
      const userLocale = await apiClient.get('/user/locale');
      
      if (userLocale.country) setCountry(userLocale.country);
      if (userLocale.language) {
        setLanguage(userLocale.language);
        localStorage.setItem('hispaloshop_language', userLocale.language);
      }
      if (userLocale.currency) setCurrency(userLocale.currency);
    } catch (error) {
      // silently handled
    }
  };

  const fetchExchangeRates = async () => {
    try {
      setRatesLoading(true);
      const data = await apiClient.get('/exchange-rates');
      setExchangeRates(data);
    } catch (error) {
      // Set fallback rates so UI doesn't break
      setExchangeRates({
        base: 'EUR',
        rates: {
          EUR: 1.0,
          USD: 1.08,
          GBP: 0.85,
          JPY: 161.0,
          CNY: 7.78,
          INR: 89.5,
          KRW: 1450.0
        },
        fallback: true
      });
    } finally {
      setRatesLoading(false);
    }
  };

  const autoDetectLocale = () => {
    // Auto-detect language from browser/device
    const browserLangs = navigator.languages || [navigator.language];
    
    // Map common browser languages to supported languages
    const supportedLangs = ['en', 'es', 'fr', 'de', 'pt', 'ar', 'hi', 'zh', 'ja', 'ko', 'ru'];
    
    let detectedLang = 'en'; // Default to English if device language not supported
    
    for (const browserLang of browserLangs) {
      const shortLang = browserLang?.split?.('-')?.[0]?.toLowerCase?.();
      if (shortLang && supportedLangs.includes(shortLang)) {
        detectedLang = shortLang;
        break;
      }
    }
    
    setLanguage(detectedLang);
    localStorage.setItem('hispaloshop_language', detectedLang);
    
    // Sync with i18n
    i18n.changeLanguage(detectedLang);
  };

  const updateCountry = async (newCountry) => {
    const oldCountry = country;
    setCountry(newCountry);
    
    // Auto-update currency based on country
    const countryCurrency = countries[newCountry]?.currency;
    if (countryCurrency) {
      setCurrency(countryCurrency);
      localStorage.setItem('hispaloshop_currency', countryCurrency);
    }
    
    // Always save to localStorage for persistence
    localStorage.setItem('hispaloshop_country', newCountry);
    
    // Save to backend if user is logged in (cart validation is handled by LocaleSelector)
    if (user) {
      try {
        await apiClient.put('/user/locale', { country: newCountry, currency: countryCurrency });
      } catch (error) {
        // Don't rollback - localStorage already has the new value
      }
    }
    
    return { oldCountry, newCountry };
  };

  const updateLanguage = async (newLanguage) => {
    
    // Update state first
    setLanguage(newLanguage);
    localStorage.setItem('hispaloshop_language', newLanguage);
    
    // Update i18n language synchronously
    try {
      await i18n.changeLanguage(newLanguage);
    } catch (err) {
      // silently handled
    }
    
    // Update document direction for RTL languages
    document.documentElement.dir = newLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLanguage;
    
    // Save to backend if user is logged in
    if (user) {
      try {
        await apiClient.put('/user/locale', { language: newLanguage });
      } catch (error) {
        // silently handled
      }
    }
  };

  const updateCurrency = async (newCurrency) => {
    setCurrency(newCurrency);
    
    // Always save to localStorage for persistence
    localStorage.setItem('hispaloshop_currency', newCurrency);
    
    // Save to backend if user is logged in
    if (user) {
      try {
        await apiClient.put('/user/locale', { currency: newCurrency });
      } catch (error) {
        // silently handled
      }
    }
  };

  const getCountryFlag = (countryCode) => {
    return countries[countryCode]?.flag || '🌍';
  };

  const getCurrencySymbol = (currencyCode) => {
    return currencies[currencyCode]?.symbol || currencyCode;
  };

  const getLanguageName = (langCode) => {
    return languages[langCode]?.native || languages[langCode]?.name || langCode;
  };

  // Translation function
  const t = (key, paramsOrDefault = {}) => {
    // Support t('key', 'default string') pattern used by some components
    const isDefaultString = typeof paramsOrDefault === 'string';
    const params = isDefaultString ? {} : paramsOrDefault;
    const defaultValue = isDefaultString ? paramsOrDefault : null;
    
    const keys = key.split('.');
    
    // Try current language first
    let translation = translations[language];
    for (const k of keys) {
      if (translation && typeof translation === 'object') {
        translation = translation[k];
      } else {
        translation = undefined;
        break;
      }
    }
    
    // If not found in current language, try English fallback
    if (typeof translation !== 'string') {
      translation = translations[defaultLanguage];
      for (const k of keys) {
        if (translation && typeof translation === 'object') {
          translation = translation[k];
        } else {
          translation = undefined;
          break;
        }
      }
    }
    
    // If still not found, use default value or key
    if (typeof translation !== 'string') {
      return defaultValue || key;
    }
    
    // Replace parameters (e.g., {{count}}, {{producer}}, {{country}})
    let result = translation;
    Object.keys(params).forEach((param) => {
      result = result.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
    });
    
    return result;
  };

  // Helper function to convert and format price
  const convertAndFormatPrice = (amount, fromCurrency = 'EUR', toCurrency = null) => {
    const targetCurrency = toCurrency || currency;
    const converted = convertPrice(amount, fromCurrency, targetCurrency, exchangeRates);
    return formatCurrency(converted, targetCurrency, currencies);
  };

  // Helper function to get raw converted price
  const getConvertedPrice = (amount, fromCurrency = 'EUR', toCurrency = null) => {
    const targetCurrency = toCurrency || currency;
    return convertPrice(amount, fromCurrency, targetCurrency, exchangeRates);
  };

  // Helper function to format price without conversion
  const formatPrice = (amount, currencyCode = null) => {
    const targetCurrency = currencyCode || currency;
    return formatCurrency(amount, targetCurrency, currencies);
  };

  // Helper function to get exchange rate display
  const getExchangeRateDisplay = (fromCurrency, toCurrency = null) => {
    const targetCurrency = toCurrency || currency;
    const rate = getExchangeRate(fromCurrency, targetCurrency, exchangeRates);
    if (!rate) return null;
    
    return {
      rate: rate.toFixed(4),
      text: `1 ${fromCurrency} = ${rate.toFixed(4)} ${targetCurrency}`
    };
  };

  const value = {
    // Current state
    country,
    language,
    currency,
    
    // Configuration
    countries,
    languages,
    currencies,
    
    // Exchange rates
    exchangeRates,
    ratesLoading,
    
    // Update functions
    updateCountry,
    updateLanguage,
    updateCurrency,
    
    // Helper functions
    getCountryFlag,
    getCurrencySymbol,
    getLanguageName,
    
    // Currency conversion helpers
    convertAndFormatPrice,
    getConvertedPrice,
    formatPrice,
    getExchangeRateDisplay,
    
    // Translation function
    t,
    
    loading
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
