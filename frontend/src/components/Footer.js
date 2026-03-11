import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Check,
  ChevronDown,
  Clock,
  Globe,
  Instagram,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';
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
    <footer className="mt-14 border-t border-stone-200 bg-stone-950 text-white" data-testid="main-footer">
      <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
        <div className="mb-10 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                Hispaloshop
              </p>
              <h2 className="font-body text-2xl font-semibold text-white">
                {t('footer.heroTitle', 'Descubrir, hablar y comprar dentro del mismo flujo.')}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-stone-300">
                {t(
                  'footer.heroDescription',
                  'Unimos productores, importadores, creadores y consumidores en una experiencia más clara y útil.',
                )}
              </p>
            </div>

            <Link
              to="/que-es"
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 px-5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              {t('footer.whatIsHispaloshop', 'Qué es Hispaloshop')}
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:pr-4">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8">
                <img src="/logo.png" alt="Hispaloshop" className="h-7 w-7 object-contain invert" loading="lazy" />
              </div>
              <div>
                <h3 className="font-body text-lg font-semibold text-white">Hispaloshop</h3>
                <p className="text-xs text-stone-400">
                  {t('footer.smallTagline', 'Alimentación honesta · comercio social claro')}
                </p>
              </div>
            </div>

            <p className="mb-5 text-sm leading-6 text-stone-300">
              {t(
                'footer.description',
                'Una plataforma para descubrir productos honestos, seguir a productores reales y comprar con más contexto.',
              )}
            </p>

            <div className="space-y-3 text-sm text-stone-300">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                <span>{t('footer.address', 'Sevilla, España')}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-stone-400" />
                <a href="tel:+34612492825" className="transition-colors hover:text-white">
                  {t('footer.phone', '+34 612 492 825')}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-stone-400" />
                <a href="mailto:bil.chanfu@hispalotrade.com" className="transition-colors hover:text-white">
                  {t('footer.email', 'bil.chanfu@hispalotrade.com')}
                </a>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
              {t('footer.shop', 'Comprar')}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/products" className="text-sm text-stone-300 transition-colors hover:text-white">
                  {t('footer.allProducts', 'Todos los productos')}
                </Link>
              </li>
              <li>
                <Link to="/stores" className="text-sm text-stone-300 transition-colors hover:text-white">
                  {t('footer.stores', 'Tiendas')}
                </Link>
              </li>
              <li>
                <Link to="/certificates" className="text-sm text-stone-300 transition-colors hover:text-white">
                  {t('footer.certificates', 'Certificados')}
                </Link>
              </li>
              <li>
                <Link to="/discover" className="text-sm text-stone-300 transition-colors hover:text-white">
                  {t('footer.explore', 'Explorar')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
              {t('footer.join', 'Únete')}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/productor/registro" className="text-sm text-stone-300 transition-colors hover:text-white">
                  {t('footer.beProducer', 'Ser productor')}
                </Link>
              </li>
              <li>
                <Link to="/influencer/aplicar" className="text-sm text-stone-300 transition-colors hover:text-white">
                  {t('footer.beInfluencer', 'Ser influencer')}
                </Link>
              </li>
              <li>
                <Link to="/importador" className="text-sm text-stone-300 transition-colors hover:text-white">
                  {t('footer.beImporter', 'Ser importador')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
              {t('footer.workingHours', 'Horario')}
            </h4>
            <div className="mb-6 flex items-start gap-3 text-sm text-stone-300">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
              <div>
                <p>{t('footer.weekdays', 'Lun - Vie: 9:00 - 18:00')}</p>
                <p>{t('footer.saturday', 'Sáb: 10:00 - 14:00')}</p>
                <p>{t('footer.sunday', 'Dom: Cerrado')}</p>
              </div>
            </div>

            <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
              {t('footer.followUs', 'Síguenos')}
            </h4>
            <a
              href="https://instagram.com/hispaloshop"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-stone-300 transition-colors hover:text-white"
            >
              <Instagram className="h-5 w-5" />
              <span>@hispaloshop</span>
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 md:hidden">
          <button
            type="button"
            onClick={() => setShowLanguageDialog(true)}
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition-colors hover:bg-white/[0.07]"
            data-testid="footer-language-selector"
          >
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-stone-400" />
              <div className="text-left">
                <p className="text-xs text-stone-400">{t('locale.language', 'Idioma')}</p>
                <p className="text-sm font-medium text-white">{languages[language]?.native || language}</p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-stone-400" />
          </button>
        </div>

        <Dialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
          <DialogContent className="max-h-[80vh] max-w-sm border-white/10 bg-stone-950">
            <DialogHeader>
              <DialogTitle className="font-body text-lg font-semibold text-white">
                {t('locale.selectLanguage', 'Seleccionar idioma')}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] space-y-1 overflow-y-auto py-2">
              {Object.entries(languages).map(([code, data]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleLanguageChange(code)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 transition-colors ${
                    language === code ? 'border border-white/15 bg-white/[0.08]' : 'hover:bg-white/[0.06]'
                  }`}
                  data-testid={`footer-language-option-${code}`}
                >
                  <span className="w-8 text-sm font-bold uppercase text-stone-400">{code}</span>
                  <span className="flex-1 text-left text-sm font-medium text-white">{data.native}</span>
                  {language === code ? <Check className="h-5 w-5 text-white" /> : null}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 md:flex-row">
          <p className="text-xs text-stone-400">
            {t('footer.copyright', '© 2026 Hispaloshop. Todos los derechos reservados.')}
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            <Link
              to="/terms"
              className="rounded-full border border-white/10 px-3 py-1.5 text-stone-300 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {t('footer.terms', 'Términos')}
            </Link>
            <Link
              to="/privacy"
              className="rounded-full border border-white/10 px-3 py-1.5 text-stone-300 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {t('footer.privacy', 'Privacidad')}
            </Link>
            <Link
              to="/help"
              className="rounded-full border border-white/10 px-3 py-1.5 text-stone-300 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {t('footer.help', 'Ayuda')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
