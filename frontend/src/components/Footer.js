import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Phone, Mail, Clock, Instagram, Globe, ChevronDown, Check } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

export default function Footer() {
  const { t, i18n } = useTranslation();
  const { language, languages, updateLanguage } = useLocale();
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);

  const handleLanguageChange = (code) => {
    updateLanguage(code);
    i18n.changeLanguage(code);
    setShowLanguageDialog(false);
  };
  
  return (
    <footer className="bg-[#1C1C1C] text-white mt-16" data-testid="main-footer">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand & Contact */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="Hispaloshop" className="w-8 h-8 object-contain invert" />
              <h3 className="font-heading text-xl font-semibold tracking-[0.02em]">Hispaloshop</h3>
            </div>
            <p className="text-sm text-stone-400 leading-relaxed mb-4">
              {t('footer.description')}
            </p>
            <div className="space-y-2 text-sm text-stone-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{t('footer.address')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <a href="tel:+34612492825" className="hover:text-white transition-colors">
                  {t('footer.phone')}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <a href="mailto:bil.chanfu@hispalotrade.com" className="hover:text-white transition-colors">
                  {t('footer.email')}
                </a>
              </div>
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h4 className="font-heading text-base font-medium mb-4 tracking-[0.02em]">{t('footer.shop')}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/products" className="text-sm text-stone-400 hover:text-white transition-colors">
                  {t('footer.allProducts')}
                </Link>
              </li>
              <li>
                <Link to="/stores" className="text-sm text-stone-400 hover:text-white transition-colors">
                  {t('footer.stores', 'Tiendas')}
                </Link>
              </li>
              <li>
                <Link to="/certificates" className="text-sm text-stone-400 hover:text-white transition-colors">
                  {t('header.certificates', 'Certificados')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Sellers & Influencers Links */}
          <div>
            <h4 className="font-heading text-base font-medium mb-4 tracking-[0.02em]">{t('footer.collaborate')}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/become-seller" className="text-sm text-stone-400 hover:text-white transition-colors">
                  {t('footer.becomeSeller')}
                </Link>
              </li>
              <li>
                <Link to="/become-influencer" className="text-sm text-stone-400 hover:text-white transition-colors">
                  {t('footer.becomeInfluencer')}
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-sm text-stone-400 hover:text-white transition-colors">
                  {t('footer.sellerLogin')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Hours & Social */}
          <div>
            <h4 className="font-heading text-base font-medium mb-4 tracking-[0.02em]">{t('footer.workingHours')}</h4>
            <div className="space-y-1 text-sm text-stone-400 mb-6">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p>{t('footer.weekdays')}</p>
                  <p>{t('footer.saturday')}</p>
                  <p>{t('footer.sunday')}</p>
                </div>
              </div>
            </div>
            
            <h4 className="font-heading text-base font-medium mb-3 tracking-[0.02em]">{t('footer.followUs')}</h4>
            <a 
              href="https://instagram.com/hispaloshop" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-stone-400 hover:text-white transition-colors"
            >
              <Instagram className="w-5 h-5" />
              <span>@hispaloshop</span>
            </a>
          </div>
        </div>

        {/* Mobile Language Selector - Only visible on mobile */}
        <div className="md:hidden mt-8 pt-6 border-t border-stone-800">
          <button
            onClick={() => setShowLanguageDialog(true)}
            className="flex items-center justify-between w-full px-4 py-3 bg-stone-800/50 hover:bg-stone-800 rounded-xl transition-colors"
            data-testid="footer-language-selector"
          >
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-stone-400" />
              <div className="text-left">
                <p className="text-xs text-stone-500">{t('locale.language', 'Idioma')}</p>
                <p className="text-sm font-medium text-white">{languages[language]?.native || language}</p>
              </div>
            </div>
            <ChevronDown className="w-5 h-5 text-stone-400" />
          </button>
        </div>

        {/* Language Dialog for Mobile */}
        <Dialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
          <DialogContent className="max-w-sm max-h-[80vh] bg-[#1C1C1C] border-stone-700">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg text-white">
                {t('locale.selectLanguage', 'Seleccionar idioma')}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[60vh] py-2">
              <div className="space-y-1">
                {Object.entries(languages).map(([code, data]) => (
                  <button
                    key={code}
                    onClick={() => handleLanguageChange(code)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      language === code 
                        ? 'bg-primary/20 border border-primary' 
                        : 'hover:bg-stone-800'
                    }`}
                    data-testid={`footer-language-option-${code}`}
                  >
                    <span className="uppercase font-bold text-sm w-8 text-stone-400">{code}</span>
                    <span className="flex-1 text-left font-medium text-white">{data.native}</span>
                    {language === code && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-stone-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-stone-500">{t('footer.copyright')}</p>
          <div className="flex gap-4 text-xs text-stone-500">
            <Link to="/terms" className="hover:text-white transition-colors">{t('footer.terms')}</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">{t('footer.privacy')}</Link>
            <Link to="/help" className="hover:text-white transition-colors">{t('footer.help')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
