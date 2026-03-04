import React, { useState, useEffect, useRef } from 'react';
import { Globe, Languages, DollarSign, Check, ChevronDown } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import CountryFlag from './CountryFlag';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import axios from 'axios';

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('hispaloshop.com') || host.includes('preview.emergentagent.com')) {
      return '/api';
    }
  }
  return '/api';
};

const MOBILE_BREAKPOINT = 768;

export default function LocaleSelector() {
  const {
    country,
    language,
    currency,
    countries,
    languages,
    currencies,
    updateCountry,
    updateLanguage,
    updateCurrency,
  } = useLocale();

  const { t, i18n } = useTranslation();
  const { fetchCart } = useCart();
  const { user } = useAuth();

  const [isMobile, setIsMobile] = useState(false);

  const [showCountryDialog, setShowCountryDialog] = useState(false);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [showCurrencyDialog, setShowCurrencyDialog] = useState(false);

  const [showCountryWarning, setShowCountryWarning] = useState(false);
  const [pendingCountry, setPendingCountry] = useState(null);
  const [unavailableItems, setUnavailableItems] = useState([]);

  const [desktopMenu, setDesktopMenu] = useState(null);
  const desktopRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!desktopRef.current) return;
      if (!desktopRef.current.contains(event.target)) {
        setDesktopMenu(null);
      }
    };

    if (desktopMenu) {
      document.addEventListener('mousedown', onClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [desktopMenu]);

  const handleCountryChange = async (newCountry) => {
    if (newCountry === country) {
      setShowCountryDialog(false);
      setDesktopMenu(null);
      return;
    }

    if (user) {
      try {
        const response = await axios.post(
          `${getApiUrl()}/cart/validate-country`,
          { country: newCountry },
          { withCredentials: true }
        );

        if (response.data.unavailable_count > 0) {
          setPendingCountry(newCountry);
          setUnavailableItems(response.data.unavailable_items);
          setShowCountryWarning(true);
          setShowCountryDialog(false);
          setDesktopMenu(null);
          return;
        }

        await confirmCountryChange(newCountry);
        return;
      } catch (error) {
        console.error('Cart validation error:', error);
      }
    }

    await updateCountry(newCountry);
    setShowCountryDialog(false);
    setDesktopMenu(null);
  };

  const confirmCountryChange = async (newCountry) => {
    try {
      await axios.post(
        `${getApiUrl()}/cart/apply-country-change`,
        { country: newCountry },
        { withCredentials: true }
      );

      await updateCountry(newCountry);
      await fetchCart();

      setShowCountryWarning(false);
      setShowCountryDialog(false);
      setPendingCountry(null);
      setUnavailableItems([]);
      setDesktopMenu(null);
    } catch (error) {
      console.error('Error applying country change:', error);
    }
  };

  const handleLanguageChange = (code) => {
    updateLanguage(code);
    i18n.changeLanguage(code);
    setShowLanguageDialog(false);
    setDesktopMenu(null);
  };

  const handleCurrencyChange = (code) => {
    updateCurrency(code);
    setShowCurrencyDialog(false);
    setDesktopMenu(null);
  };

  const MobileDialogSelector = ({
    isOpen,
    onClose,
    title,
    items,
    selectedValue,
    onSelect,
    renderItem,
  }) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[80vh] bg-[#FAF7F2]">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[60vh] py-2">
          <div className="space-y-1">
            {items.map(([code, data]) => (
              <button
                key={code}
                onClick={() => onSelect(code)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  selectedValue === code
                    ? 'bg-primary/10 border border-primary'
                    : 'hover:bg-stone-100'
                }`}
                data-testid={`mobile-option-${code}`}
              >
                {renderItem(code, data)}
                {selectedValue === code && (
                  <Check className="w-5 h-5 text-primary ml-auto" />
                )}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const MobileTriggerButton = ({ icon: Icon, label, countryCode, onClick, testId }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/70 hover:bg-white transition-colors border border-stone-200"
      data-testid={testId}
    >
      {countryCode ? (
        <CountryFlag countryCode={countryCode} size="md" />
      ) : (
        <Icon className="w-5 h-5 text-text-secondary" />
      )}
      <span className="text-sm font-medium">{label}</span>
      <ChevronDown className="w-4 h-4 text-text-muted ml-auto" />
    </button>
  );

  const DesktopTrigger = ({ menu, icon: Icon, children, testId }) => (
    <Button
      variant="ghost"
      size="sm"
      className={`h-9 gap-1.5 font-body text-sm hover:bg-white/60 ${desktopMenu === menu ? 'bg-white/70' : ''}`}
      onClick={() => setDesktopMenu((prev) => (prev === menu ? null : menu))}
      data-testid={testId}
      type="button"
    >
      <Icon className="w-4 h-4" />
      {children}
      <ChevronDown className={`w-4 h-4 transition-transform ${desktopMenu === menu ? 'rotate-180' : ''}`} />
    </Button>
  );

  const DesktopMenu = ({ isOpen, title, children }) => {
    if (!isOpen) return null;
    return (
      <div className="absolute top-full right-0 mt-2 w-64 rounded-xl border border-stone-200 bg-white shadow-xl z-[110] overflow-hidden">
        <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-stone-500 border-b border-stone-100">
          {title}
        </div>
        <div className="max-h-80 overflow-y-auto p-1">{children}</div>
      </div>
    );
  };

  return (
    <>
      {isMobile ? (
        <div className="flex flex-col gap-2 w-full">
          <MobileTriggerButton
            icon={Globe}
            countryCode={country}
            label={countries[country]?.name || country}
            onClick={() => setShowCountryDialog(true)}
            testId="country-selector-mobile"
          />
          <MobileTriggerButton
            icon={Languages}
            label={languages[language]?.native || language}
            onClick={() => setShowLanguageDialog(true)}
            testId="language-selector-mobile"
          />
          <MobileTriggerButton
            icon={DollarSign}
            label={`${currencies[currency]?.symbol} ${currency}`}
            onClick={() => setShowCurrencyDialog(true)}
            testId="currency-selector-mobile"
          />

          <MobileDialogSelector
            isOpen={showCountryDialog}
            onClose={setShowCountryDialog}
            title={t('locale.selectCountry')}
            items={Object.entries(countries)}
            selectedValue={country}
            onSelect={handleCountryChange}
            renderItem={(code, data) => (
              <>
                <CountryFlag countryCode={code} size="lg" className="mr-2" />
                <span className="flex-1 text-left font-medium">{data.name}</span>
              </>
            )}
          />

          <MobileDialogSelector
            isOpen={showLanguageDialog}
            onClose={setShowLanguageDialog}
            title={t('locale.selectLanguage')}
            items={Object.entries(languages)}
            selectedValue={language}
            onSelect={handleLanguageChange}
            renderItem={(code, data) => (
              <>
                <span className="uppercase font-bold text-sm w-8 text-text-secondary">{code}</span>
                <span className="flex-1 text-left font-medium">{data.native}</span>
              </>
            )}
          />

          <MobileDialogSelector
            isOpen={showCurrencyDialog}
            onClose={setShowCurrencyDialog}
            title={t('locale.selectCurrency')}
            items={Object.entries(currencies)}
            selectedValue={currency}
            onSelect={handleCurrencyChange}
            renderItem={(code, data) => (
              <>
                <span className="text-xl font-bold w-8">{data.symbol}</span>
                <span className="flex-1 text-left font-medium">{code}</span>
                <span className="text-sm text-text-secondary">{data.name}</span>
              </>
            )}
          />
        </div>
      ) : (
        <div className="relative" ref={desktopRef}>
          <div className="flex items-center gap-2">
            <DesktopTrigger menu="country" icon={Globe} testId="country-selector">
              <CountryFlag countryCode={country} size="md" />
              <span>{country}</span>
            </DesktopTrigger>

            <DesktopTrigger menu="language" icon={Languages} testId="language-selector">
              <span className="uppercase">{language}</span>
            </DesktopTrigger>

            <DesktopTrigger menu="currency" icon={DollarSign} testId="currency-selector">
              <span>{currency}</span>
            </DesktopTrigger>
          </div>

          <DesktopMenu isOpen={desktopMenu === 'country'} title={t('locale.selectCountry')}>
            {Object.entries(countries).map(([code, data]) => (
              <button
                key={code}
                onClick={() => handleCountryChange(code)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm ${country === code ? 'bg-stone-100 text-stone-900' : 'hover:bg-stone-50 text-stone-700'}`}
                data-testid={`country-option-${code}`}
              >
                <CountryFlag countryCode={code} size="md" />
                <span className="flex-1">{data.name}</span>
                {country === code && <Check className="w-4 h-4 text-[#2D5A27]" />}
              </button>
            ))}
          </DesktopMenu>

          <DesktopMenu isOpen={desktopMenu === 'language'} title={t('locale.selectLanguage')}>
            {Object.entries(languages).map(([code, data]) => (
              <button
                key={code}
                onClick={() => handleLanguageChange(code)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm ${language === code ? 'bg-stone-100 text-stone-900' : 'hover:bg-stone-50 text-stone-700'}`}
                data-testid={`language-option-${code}`}
              >
                <span className="uppercase font-semibold text-xs w-7">{code}</span>
                <span className="flex-1">{data.native}</span>
                {language === code && <Check className="w-4 h-4 text-[#2D5A27]" />}
              </button>
            ))}
          </DesktopMenu>

          <DesktopMenu isOpen={desktopMenu === 'currency'} title={t('locale.selectCurrency')}>
            {Object.entries(currencies).map(([code, data]) => (
              <button
                key={code}
                onClick={() => handleCurrencyChange(code)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm ${currency === code ? 'bg-stone-100 text-stone-900' : 'hover:bg-stone-50 text-stone-700'}`}
                data-testid={`currency-option-${code}`}
              >
                <span className="text-base w-6">{data.symbol}</span>
                <span className="flex-1">{code}</span>
                {currency === code && <Check className="w-4 h-4 text-[#2D5A27]" />}
              </button>
            ))}
          </DesktopMenu>
        </div>
      )}

      <AlertDialog open={showCountryWarning} onOpenChange={setShowCountryWarning}>
        <AlertDialogContent className="bg-[#FAF7F2] border-[#DED7CE]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-xl text-[#1C1C1C]">
              {t('locale.countryChange')}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-body text-[#4A4A4A]">
              {unavailableItems.length > 0 && (
                <>
                  <p className="mb-3 flex items-center gap-2 flex-wrap">
                    <span>{t('locale.countryChangeWarningPrefix')}</span>
                    <CountryFlag countryCode={pendingCountry} size="md" />
                    <span className="font-medium">{countries[pendingCountry]?.name}</span>
                    <span>{t('locale.countryChangeWarningSuffix')}</span>
                  </p>
                  <ul className="list-disc list-inside space-y-1 mb-3 text-sm">
                    {unavailableItems.map((item, idx) => (
                      <li key={idx}>
                        {item.product_name}
                        {item.variant_name && ` - ${item.variant_name}`}
                        {item.pack_label && ` (${item.pack_label})`}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm font-medium">
                    {t('locale.priceUpdate', { country: countries[pendingCountry]?.name })}
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setShowCountryWarning(false)}
              className="font-body"
            >
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmCountryChange(pendingCountry)}
              className="font-body bg-[#1C1C1C] text-white hover:bg-[#1C1C1C]/90"
            >
              {t('common.continue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
