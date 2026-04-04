import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Globe } from 'lucide-react';
import Logo from '../brand/Logo';
import { useLocale } from '../../context/LocaleContext';
import { useTranslation } from 'react-i18next';

const FOOTER_LINKS = [
  {
    titleKey: 'landing.footer.plataforma',
    titleFallback: 'Plataforma',
    links: [
      { labelKey: 'landing.nav.consumidor', fallback: 'Consumidor', to: '/consumidor' },
      { labelKey: 'landing.nav.productor', fallback: 'Productor', to: '/productor' },
      { labelKey: 'landing.nav.influencer', fallback: 'Influencer', to: '/influencer' },
      { labelKey: 'landing.nav.distribuidor', fallback: 'Distribuidor', to: '/distribuidor' },
    ],
  },
  {
    titleKey: 'landing.footer.empresa',
    titleFallback: 'Empresa',
    links: [
      { labelKey: 'landing.footer.contacto', fallback: 'Contacto', to: '/contacto' },
    ],
  },
  {
    titleKey: 'landing.footer.legal',
    titleFallback: 'Legal',
    links: [
      { labelKey: 'landing.footer.privacidad', fallback: 'Privacidad', to: '/legal/privacidad' },
      { labelKey: 'landing.footer.terminos', fallback: 'Términos', to: '/legal/terminos' },
      { labelKey: 'landing.footer.cookies', fallback: 'Cookies', to: '/legal/cookies' },
    ],
  },
];

export default function InfoFooter() {
  const { t, i18n } = useTranslation();
  const { country, countries, updateCountry } = useLocale();
  const [countryOpen, setCountryOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  const COUNTRIES = useMemo(
    () => Object.entries(countries || {}).map(([code, data]: [string, { flag?: string; name?: string }]) => ({
      code, flag: data.flag || '', name: data.name || code,
    })),
    [countries],
  );

  const LANGUAGES = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'it', label: 'Italiano' },
    { code: 'pt', label: 'Português' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
  ];

  const selectedCountry = COUNTRIES.find(c => c.code === country) || COUNTRIES[0] || { code: 'ES', flag: '🇪🇸', name: 'España' };
  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) setCountryOpen(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <footer className="bg-stone-950 border-t border-stone-800">
      <div className="max-w-[1100px] mx-auto px-6 py-16">
        {/* Top: Logo + Link columns */}
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          {/* Logo + tagline */}
          <div className="max-w-[240px]">
            <div className="flex items-center gap-2 mb-3">
              <Logo variant="icon" theme="dark" size={24} />
              <span className="text-[16px] font-semibold text-white tracking-tight">
                hispaloshop
              </span>
            </div>
            <p className="text-sm text-stone-500 leading-relaxed m-0">
              {t('landing.footer.tagline', 'Del productor a tu mesa. Sin intermediarios.')}
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-12">
            {FOOTER_LINKS.map(col => (
              <div key={col.titleKey}>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500 mb-3">
                  {t(col.titleKey, col.titleFallback)}
                </h4>
                <ul className="list-none m-0 p-0 flex flex-col gap-2">
                  {col.links.map(link => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-[13px] text-stone-400 no-underline transition-colors duration-200 hover:text-white"
                      >
                        {t(link.labelKey, link.fallback)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-stone-800 mt-12 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Selectors */}
            <div className="flex items-center gap-3">
              {/* Country selector */}
              <div ref={countryRef} className="relative">
                <button
                  type="button"
                  onClick={() => { setCountryOpen(v => !v); setLangOpen(false); }}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-stone-400 text-xs cursor-pointer flex items-center gap-1.5 transition-colors hover:bg-white/10"
                >
                  {selectedCountry.flag} {selectedCountry.name}
                </button>
                {countryOpen && (
                  <div className="absolute bottom-[calc(100%+6px)] left-0 w-[200px] bg-stone-900 border border-white/10 rounded-xl overflow-hidden z-50">
                    <div className="max-h-48 overflow-y-auto">
                      {COUNTRIES.map(c => (
                        <button
                          type="button"
                          key={c.code}
                          onClick={() => { updateCountry(c.code); setCountryOpen(false); }}
                          className={`flex items-center gap-2 w-full px-3 py-2 border-none text-left text-xs cursor-pointer ${
                            country === c.code ? 'bg-white/10 text-white font-semibold' : 'text-stone-400 hover:bg-white/5'
                          }`}
                        >
                          <span>{c.flag}</span>
                          <span className="truncate">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Language selector */}
              <div ref={langRef} className="relative">
                <button
                  type="button"
                  onClick={() => { setLangOpen(v => !v); setCountryOpen(false); }}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-stone-400 text-xs cursor-pointer flex items-center gap-1.5 transition-colors hover:bg-white/10"
                >
                  <Globe size={12} />
                  {currentLang.label}
                </button>
                {langOpen && (
                  <div className="absolute bottom-[calc(100%+6px)] left-0 w-[160px] bg-stone-900 border border-white/10 rounded-xl overflow-hidden z-50">
                    {LANGUAGES.map(l => (
                      <button
                        type="button"
                        key={l.code}
                        onClick={() => { i18n.changeLanguage(l.code); setLangOpen(false); }}
                        className={`flex items-center w-full px-3 py-2 border-none text-left text-xs cursor-pointer ${
                          i18n.language === l.code ? 'bg-white/10 text-white font-semibold' : 'text-stone-400 hover:bg-white/5'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Social + copyright */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <a href="https://instagram.com/hispaloshop" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-stone-500 hover:text-white transition-colors">
                  <Instagram size={16} />
                </a>
                <a href="https://tiktok.com/@hispaloshop" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-stone-500 hover:text-white transition-colors text-xs font-semibold">
                  TK
                </a>
                <a href="https://linkedin.com/company/hispaloshop" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-stone-500 hover:text-white transition-colors text-xs font-bold">
                  in
                </a>
              </div>
              <span className="text-[11px] text-stone-600">
                © {new Date().getFullYear()} Hispaloshop SL
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
