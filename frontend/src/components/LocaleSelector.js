import React, { useState, useEffect } from 'react';
import { Globe, Languages, DollarSign, Check, X, ChevronDown } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import CountryFlag from './CountryFlag';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './ui/dropdown-menu';
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

// Smart API URL
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('hispaloshop.com') || host.includes('preview.emergentagent.com')) {
      return '/api';
    }
  }
  return '/api';
};

// Mobile breakpoint
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
  
  // State for mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  // Mobile dialog states
  const [showCountryDialog, setShowCountryDialog] = useState(false);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [showCurrencyDialog, setShowCurrencyDialog] = useState(false);

  // Country change warning states
  const [showCountryWarning, setShowCountryWarning] = useState(false);
  const [pendingCountry, setPendingCountry] = useState(null);
  const [unavailableItems, setUnavailableItems] = useState([]);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCountryChange = async (newCountry) => {
    if (newCountry === country) {
      setShowCountryDialog(false);
      return;
    }

    // Only validate cart if user is logged in
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
          return;
        } else {
          await confirmCountryChange(newCountry);
          return;
        }
      } catch (error) {
        console.error('Cart validation error:', error);
        // Fall through to simple country update
      }
    }
    
    // For guests or on validation error, just update the country directly
    await updateCountry(newCountry);
    setShowCountryDialog(false);
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
    } catch (error) {
      console.error('Error applying country change:', error);
    }
  };

  const handleLanguageChange = (code) => {
    updateLanguage(code);
    i18n.changeLanguage(code);
    setShowLanguageDialog(false);
  };

  const handleCurrencyChange = (code) => {
    updateCurrency(code);
    setShowCurrencyDialog(false);
  };

  // Mobile Dialog Selector - uses Dialog instead of Sheet for better UX in sidebar
  const MobileDialogSelector = ({ 
    isOpen, 
    onClose, 
    title, 
    items, 
    selectedValue, 
    onSelect,
    renderItem 
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

  // Mobile trigger buttons - more touch-friendly
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

  // Desktop Dropdown
  const DesktopDropdown = ({ trigger, label, items, selectedValue, onSelect, renderItem, testId }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-white border border-stone-200 shadow-lg z-[100]">
        <DropdownMenuLabel className="font-body text-xs text-stone-500 px-2 py-1.5">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-stone-200" />
        <div className="max-h-80 overflow-y-auto">
          {items.map(([code, data]) => (
            <DropdownMenuItem
              key={code}
              onClick={() => onSelect(code)}
              className="font-body cursor-pointer text-stone-800 hover:bg-stone-100 focus:bg-stone-100 focus:text-stone-900"
              data-testid={`${testId}-${code}`}
            >
              {renderItem(code, data)}
              {selectedValue === code && <Check className="w-4 h-4 text-primary ml-auto" />}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {isMobile ? (
        // MOBILE: Use full-width buttons that open dialogs
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

          {/* Country Dialog */}
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

          {/* Language Dialog - No flags, just text */}
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

          {/* Currency Dialog */}
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
        // DESKTOP: Use compact dropdowns
        <div className="flex items-center gap-2">
          <DesktopDropdown
            trigger={
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 gap-1.5 font-body text-sm hover:bg-white/50"
                data-testid="country-selector"
              >
                <Globe className="w-4 h-4" />
                <CountryFlag countryCode={country} size="md" />
                <span>{country}</span>
              </Button>
            }
            label={t('locale.selectCountry')}
            items={Object.entries(countries)}
            selectedValue={country}
            onSelect={handleCountryChange}
            testId="country-option"
            renderItem={(code, data) => (
              <>
                <CountryFlag countryCode={code} size="md" className="mr-2" />
                <span className="flex-1">{data.name}</span>
              </>
            )}
          />

          <DesktopDropdown
            trigger={
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 gap-1.5 font-body text-sm hover:bg-white/50"
                data-testid="language-selector"
              >
                <Languages className="w-4 h-4" />
                <span className="uppercase">{language}</span>
              </Button>
            }
            label={t('locale.selectLanguage')}
            items={Object.entries(languages)}
            selectedValue={language}
            onSelect={handleLanguageChange}
            testId="language-option"
            renderItem={(code, data) => (
              <>
                <span className="uppercase font-medium text-xs w-8 text-[#7A7A7A]">{code}</span>
                <span className="flex-1">{data.native}</span>
              </>
            )}
          />

          <DesktopDropdown
            trigger={
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 gap-1.5 font-body text-sm hover:bg-white/50"
                data-testid="currency-selector"
              >
                <DollarSign className="w-4 h-4" />
                <span>{currency}</span>
              </Button>
            }
            label={t('locale.selectCurrency')}
            items={Object.entries(currencies)}
            selectedValue={currency}
            onSelect={handleCurrencyChange}
            testId="currency-option"
            renderItem={(code, data) => (
              <>
                <span className="mr-2 text-lg">{data.symbol}</span>
                <span className="flex-1">{code}</span>
                <span className="text-xs text-[#4A4A4A] ml-2">{data.name}</span>
              </>
            )}
          />
        </div>
      )}

      {/* Country Change Warning Modal */}
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
