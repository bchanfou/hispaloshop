import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Logo from '../brand/Logo';
import { useTranslation } from 'react-i18next';

// Helper para generar URLs con prefijo de idioma para landings
const LANDING_LANGS = ['es', 'en', 'ko'];
function useLocalizedLandingPath() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'es';
  
  return (path: string): string => {
    // Solo aplicar prefijo para landings y si no es español
    const isLanding = ['/productor', '/distribuidor', '/influencer', '/consumidor', '/about', '/landing'].some(
      landing => path === landing || path.startsWith(landing + '/')
    );
    if (isLanding && lang !== 'es' && LANDING_LANGS.includes(lang)) {
      return `/${lang}${path}`;
    }
    return path;
  };
}

const NAV_LINKS = [
  { labelKey: 'landing.nav.consumidor', fallback: 'Consumidor', to: '/consumidor' },
  { labelKey: 'landing.nav.productor', fallback: 'Productor', to: '/productor' },
  { labelKey: 'landing.nav.influencer', fallback: 'Influencer', to: '/influencer' },
  { labelKey: 'landing.nav.distribuidor', fallback: 'Distribuidor', to: '/distribuidor' },
];

export default function InfoNav() {
  const { t } = useTranslation();
  const getLocalizedPath = useLocalizedLandingPath();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
          scrolled
            ? 'bg-stone-50/90 backdrop-blur-[20px] border-b border-stone-200'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        {/* ── Mobile ── */}
        <div className="lg:hidden h-[52px] flex items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <Logo variant="icon" theme="light" size={24} />
            <span className="text-[15px] font-semibold tracking-tight text-stone-950">
              hispaloshop
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="py-[6px] px-3.5 text-[11px] font-medium text-stone-950 no-underline border border-stone-300 rounded-full bg-transparent transition-colors hover:bg-stone-100"
            >
              {t('landing.nav.entrar', 'Entrar')}
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(v => !v)}
              className="flex items-center justify-center w-9 h-9 border-none bg-transparent cursor-pointer text-stone-950"
              aria-label={drawerOpen ? t('landing.nav.closeMenu', 'Cerrar menú') : t('landing.nav.openMenu', 'Abrir menú')}
            >
              {drawerOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* ── Desktop ── */}
        <div className="hidden lg:grid h-[60px] grid-cols-[180px_1fr_220px] items-center max-w-[1100px] mx-auto px-6">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <Logo variant="icon" theme="light" size={26} />
            <span className="text-[16px] font-semibold tracking-tight text-stone-950">
              hispaloshop
            </span>
          </Link>

          <nav className="flex items-center justify-center gap-0.5">
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={getLocalizedPath(link.to)}
                className="py-1.5 px-4 text-[13px] font-medium text-stone-500 no-underline rounded-full transition-all duration-200 hover:text-stone-950 hover:bg-stone-100"
              >
                {t(link.labelKey, link.fallback)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-2.5">
            <Link
              to="/login"
              className="py-[7px] px-4 text-[13px] font-medium text-stone-600 no-underline transition-colors hover:text-stone-950"
            >
              {t('landing.nav.entrar', 'Entrar')}
            </Link>
            <Link
              to="/register"
              className="py-[7px] px-5 text-[13px] font-semibold text-white no-underline rounded-full bg-stone-950 transition-all duration-200 hover:bg-stone-800"
            >
              {t('landing.nav.empiezaGratis', 'Empieza gratis')}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-stone-950/30 backdrop-blur-sm z-50"
            />

            <motion.div
              ref={drawerRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-[280px] bg-stone-50 z-[51] flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
                <span className="text-sm font-semibold text-stone-950 tracking-tight">
                  {t('landing.nav.menu', 'Menú')}
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Cerrar menú"
                  className="flex items-center justify-center w-8 h-8 border-none bg-stone-200 rounded-full cursor-pointer"
                >
                  <X size={14} className="text-stone-700" />
                </button>
              </div>

              <nav className="flex-1 py-2 px-3 overflow-y-auto">
                {NAV_LINKS.map(link => (
                  <Link
                    key={link.to}
                    to={getLocalizedPath(link.to)}
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-3 py-3.5 rounded-xl no-underline text-[15px] font-medium text-stone-800 transition-colors hover:bg-stone-100"
                  >
                    {t(link.labelKey, link.fallback)}
                    <ChevronRight size={14} className="text-stone-400" />
                  </Link>
                ))}
              </nav>

              <div className="p-4 border-t border-stone-200 flex flex-col gap-2">
                <Link
                  to="/register"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-center h-11 rounded-full bg-stone-950 text-white text-[13px] font-semibold no-underline"
                >
                  {t('landing.nav.empiezaGratis', 'Empieza gratis')}
                </Link>
                <Link
                  to="/login"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-center h-11 rounded-full bg-transparent text-stone-950 text-[13px] font-medium no-underline border border-stone-200"
                >
                  {t('landing.nav.entrar', 'Entrar')}
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
