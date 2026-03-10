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
  const { t } = useTranslation();
  const { language, languages, updateLanguage } = useLocale();
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);

  const handleLanguageChange = async (code) => {
    await updateLanguage(code);
    setShowLanguageDialog(false);
  };
  
  return (
    <footer className="bg-[#171717] text-white mt-14" data-testid="main-footer">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10 rounded-2xl border border-stone-700/80 bg-gradient-to-r from-stone-900/70 to-stone-800/50 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-stone-400 mb-1">Red Hispaloshop</p>
            <p className="text-sm text-stone-200">Productores, importadores e influencers en un mismo flujo de venta.</p>
          </div>
          <Link to="/about" className="text-xs text-stone-200 hover:text-white underline-offset-2 hover:underline">
            Ver cómo funciona
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand & Contact */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="Hispaloshop" className="w-8 h-8 object-contain invert" />
              <h3 className="font-heading text-xl font-semibold tracking-[0.02em]">Hispaloshop</h3>
            </div>
            <p className="text-sm text-stone-300 leading-relaxed mb-4">
              {t('footer.description')}
            </p>
            <div className="space-y-2 text-sm text-stone-300">
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
            <h4 className="font-heading text-[13px] uppercase tracking-wider text-stone-400 mb-4">{t('footer.shop')}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/products" className="text-sm text-stone-300 hover:text-white transition-colors">
                  {t('footer.allProducts')}
                </Link>
              </li>
              <li>
                <Link to="/stores" className="text-sm text-stone-300 hover:text-white transition-colors">
                  {t('footer.stores', 'Tiendas')}
                </Link>
              </li>
              <li>
                <Link to="/certificates" className="text-sm text-stone-300 hover:text-white transition-colors">
                  {t('header.certificates', 'Certificados')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Producer / Influencer / Importer Links */}
          <div>
            <h4 className="font-heading text-[13px] uppercase tracking-wider text-stone-400 mb-4">Unete</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/productor/registro" className="text-sm text-stone-300 hover:text-white transition-colors">
                  Ser Productor
                </Link>
              </li>
              <li>
                <Link to="/influencers/registro" className="text-sm text-stone-300 hover:text-white transition-colors">
                  Ser Influencer
                </Link>
              </li>
              <li>
                <Link to="/importador" className="text-sm text-stone-300 hover:text-white transition-colors">
                  Ser Importador
                </Link>
              </li>
            </ul>
          </div>

          {/* Hours & Social */}
          <div>
            <h4 className="font-heading text-[13px] uppercase tracking-wider text-stone-400 mb-4">{t('footer.workingHours')}</h4>
            <div className="space-y-1 text-sm text-stone-300 mb-6">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p>{t('footer.weekdays')}</p>
                  <p>{t('footer.saturday')}</p>
                  <p>{t('footer.sunday')}</p>
                </div>
              </div>
            </div>
            
            <h4 className="font-heading text-[13px] uppercase tracking-wider text-stone-400 mb-3">{t('footer.followUs')}</h4>
            <a 
              href="https://instagram.com/hispaloshop" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-stone-300 hover:text-white transition-colors"
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
        <div className="mt-12 pt-6 border-t border-stone-800/90 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-stone-400">{t('footer.copyright')}</p>
          <div className="flex gap-2 text-xs">
            <Link to="/terms" className="px-2.5 py-1 rounded-full bg-stone-800/70 text-stone-300 hover:text-white transition-colors">{t('footer.terms')}</Link>
            <Link to="/privacy" className="px-2.5 py-1 rounded-full bg-stone-800/70 text-stone-300 hover:text-white transition-colors">{t('footer.privacy')}</Link>
            <Link to="/help" className="px-2.5 py-1 rounded-full bg-stone-800/70 text-stone-300 hover:text-white transition-colors">{t('footer.help')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

