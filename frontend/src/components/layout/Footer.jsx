import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Instagram } from 'lucide-react';
import Logo from '../brand/Logo';
import { useLocale } from '../../context/LocaleContext';
import { useTranslation } from 'react-i18next';

const LEGAL_LINKS = [
  { label: 'Privacidad', to: '/privacy' },
  { label: 'T\u00e9rminos', to: '/terms' },
  { label: 'Cookies', to: '/terms' },
  { label: 'Contacto', to: '/contact' },
];

export default function Footer() {
  const { country, countries, updateCountry } = useLocale();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [footerSearch, setFooterSearch] = useState('');

  const COUNTRIES = useMemo(() =>
    Object.entries(countries || {}).map(([code, data]) => ({ code, flag: data.flag || '', name: data.name || code })),
    [countries]
  );
  const selectedCountry = COUNTRIES.find(c => c.code === country) || COUNTRIES[0] || { code: 'ES', flag: '', name: t('admin.countries.ES', 'España') };
  const setCountry = (code) => updateCountry(code);

  const selectCountry = (code) => {
    setCountry(code);
    try { localStorage.setItem('hsp_country', code); } catch { /* */ }
    setDropdownOpen(false);
  };

  useEffect(() => {
    if (!dropdownOpen) return;
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) { setDropdownOpen(false); setFooterSearch(''); }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [dropdownOpen]);

  return (
    <footer className="bg-stone-950 border-t border-stone-800 px-6 py-10 md:py-16">
      <div className="max-w-6xl mx-auto">

        {/* Main grid: logo | legal links | country + social */}
        <div className="flex flex-col items-center gap-6 text-center md:grid md:grid-cols-[200px_1fr_200px] md:items-center md:text-left md:gap-0">

          {/* Logo + wordmark */}
          <div className="flex items-center gap-2">
            <Logo variant="icon" theme="dark" size={28} />
            <span className="text-[17px] font-semibold text-white">
              hispaloshop
            </span>
          </div>

          {/* Legal links */}
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {LEGAL_LINKS.map((link, i) => (
              <React.Fragment key={link.to + i}>
                <Link
                  to={link.to}
                  className="text-sm text-stone-400 hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
                {i < LEGAL_LINKS.length - 1 && (
                  <span className="text-stone-700 mx-1">&middot;</span>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Country + Social */}
          <div className="flex items-center gap-3 justify-center md:justify-end">
            {/* Country selector */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-stone-400 text-sm cursor-pointer flex items-center gap-1.5"
              >
                {selectedCountry.flag} {selectedCountry.name} &#9660;
              </button>

              {dropdownOpen && (
                <div className="absolute bottom-[calc(100%+8px)] right-0 w-[220px] bg-stone-900 border border-white/10 rounded-2xl overflow-hidden z-50 shadow-lg">
                  <div className="p-2">
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={footerSearch}
                      onChange={e => setFooterSearch(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                  {COUNTRIES.filter(c => !footerSearch || c.name.toLowerCase().includes(footerSearch.toLowerCase()) || c.code.toLowerCase().includes(footerSearch.toLowerCase())).map(c => (
                    <button
                      key={c.code}
                      onClick={() => { selectCountry(c.code); setFooterSearch(''); }}
                      className={`flex items-center gap-2 w-full px-3 py-2 border-none text-left text-sm ${
                        country === c.code ? 'bg-white/[0.08] text-white font-semibold' : 'text-stone-400 hover:bg-white/[0.04]'
                      } cursor-pointer`}
                    >
                      <span>{c.flag}</span>
                      <span className="flex-1 truncate">{c.name}</span>
                    </button>
                  ))}
                  </div>
                </div>
              )}
            </div>

            {/* Social icons */}
            <div className="flex gap-3 items-center">
              <a
                href="/"
                aria-label="Instagram"
                className="text-stone-400 hover:text-white transition-colors flex"
              >
                <Instagram size={18} />
              </a>
              <a
                href="/"
                aria-label="TikTok"
                className="text-stone-400 hover:text-white transition-colors flex"
              >
                <span className="text-base leading-none">TK</span>
              </a>
              <a
                href="/"
                aria-label="LinkedIn"
                className="text-stone-400 hover:text-white transition-colors flex"
              >
                <span className="text-base leading-none font-bold">in</span>
              </a>
            </div>
          </div>
        </div>

        {/* App Store + Google Play (mobile-centered) */}
        <div className="flex justify-center gap-3 mt-8">
          <div className="w-[140px] h-10 rounded-2xl border border-white/[0.15] bg-stone-950 flex items-center justify-center gap-1.5">
            <span className="text-base">{'\u{1F34E}'}</span>
            <span className="text-xs text-white font-medium">App Store</span>
          </div>
          <div className="w-[140px] h-10 rounded-2xl border border-white/[0.15] bg-stone-950 flex items-center justify-center gap-1.5">
            <span className="text-base">&#9654;</span>
            <span className="text-xs text-white font-medium">Google Play</span>
          </div>
        </div>
        <p className="text-center text-[11px] text-stone-700 mt-2 mb-0">
          Pr&oacute;ximamente
        </p>

        {/* Copyright */}
        <p className="mt-12 pt-6 border-t border-stone-800 text-center text-xs text-stone-500 mb-0">
          &copy; 2026 Hispaloshop SL &middot; Todos los derechos reservados
        </p>
      </div>
    </footer>
  );
}
