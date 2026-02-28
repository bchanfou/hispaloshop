import React from 'react';
import { Languages, Check } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { Button } from './ui/button';

/**
 * Simple language switcher component that can be added to any page.
 * Shows current language and allows switching between supported languages.
 */
export default function LanguageSwitcher({ variant = 'default', className = '' }) {
  const { language, languages, updateLanguage } = useLocale();
  const { t, i18n } = useTranslation();

  // DEBUG: Log what data we have
  console.log('[LanguageSwitcher] Render - languages:', Object.keys(languages || {}), 'current:', language);

  const handleLanguageChange = (code) => {
    updateLanguage(code);
    i18n.changeLanguage(code);
  };

  const currentLang = languages[language] || { native: language, name: language };

  if (variant === 'minimal') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-8 gap-1 text-xs font-medium ${className}`}
            data-testid="language-switcher"
          >
            <Languages className="w-3.5 h-3.5" />
            <span className="uppercase">{language}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-white border border-stone-200 shadow-lg z-[100]">
          {Object.entries(languages).map(([code, data]) => (
            <DropdownMenuItem
              key={code}
              onClick={() => handleLanguageChange(code)}
              className="cursor-pointer text-stone-800 hover:bg-stone-100"
              data-testid={`lang-option-${code}`}
            >
              <span className="flex-1">{data.native}</span>
              <span className="text-xs text-stone-500 ml-2">{data.name}</span>
              {language === code && <Check className="w-4 h-4 text-primary ml-2" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default variant with label
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`h-9 gap-2 ${className}`}
          data-testid="language-switcher"
        >
          <Languages className="w-4 h-4" />
          <span>{currentLang.native}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-white border border-stone-200 shadow-lg z-[100]">
        <DropdownMenuLabel className="text-xs text-stone-500">
          {t('locale.selectLanguage')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-stone-200" />
        <div className="max-h-80 overflow-y-auto">
          {Object.entries(languages).map(([code, data]) => (
            <DropdownMenuItem
              key={code}
              onClick={() => handleLanguageChange(code)}
              className="cursor-pointer text-stone-800 hover:bg-stone-100"
              data-testid={`lang-option-${code}`}
            >
              <span className="flex-1 font-medium">{data.native}</span>
              <span className="text-xs text-stone-500">{data.name}</span>
              {language === code && <Check className="w-4 h-4 text-primary ml-2" />}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
