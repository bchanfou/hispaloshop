import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Globe,
  LayoutDashboard,
  Menu,
  Search,
  ShoppingCart,
  User,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLocale } from '../context/LocaleContext';
import { getDefaultRoute } from '../lib/navigation';
import { Button } from './ui/button';
import { Input } from './ui/input';

const NAV_LINKS = [
  { labelKey: 'nav.explore', fallback: 'Explorar', to: '/discover' },
  { labelKey: 'nav.products', fallback: 'Productos', to: '/products' },
  { labelKey: 'nav.stores', fallback: 'Tiendas', to: '/stores' },
  { labelKey: 'nav.certificates', fallback: 'Certificados', to: '/certificates' },
];

export default function Header() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { getTotalItems } = useCart();
  const { country, language, currency } = useLocale();

  const [query, setQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const totalItems = getTotalItems();
  const dashboardUrl = user ? getDefaultRoute(user, user.onboarding_completed) : '/login';
  const firstName = useMemo(() => {
    const raw = user?.name || user?.full_name || user?.username || '';
    return raw.trim().split(' ')[0] || t('nav.myAccount', 'Mi cuenta');
  }, [t, user]);

  const mobileMenuLinks = useMemo(
    () => [
      ...NAV_LINKS,
      { labelKey: 'nav.about', fallback: 'Qué es Hispaloshop', to: '/about' },
    ],
    []
  );

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
        setMobileSearchOpen(false);
      }
    };

    const onEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setMobileSearchOpen(false);
      }
    };

    if (menuOpen || mobileSearchOpen) {
      document.addEventListener('mousedown', onPointerDown);
    }
    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [menuOpen, mobileSearchOpen]);

  const runSearch = (event) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    navigate(`/products?search=${encodeURIComponent(value)}`);
    setMenuOpen(false);
    setMobileSearchOpen(false);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
  };

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[200] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-stone-950 focus:shadow-lg focus:outline-none"
      >
        {t('nav.skipToMain', 'Saltar al contenido principal')}
      </a>

      <header
        className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/92 backdrop-blur-xl"
        data-testid="main-header"
      >
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="flex h-16 items-center gap-3 md:h-[76px] md:gap-5">
            <Link to="/" className="flex shrink-0 items-center gap-3" data-testid="logo-link">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-stone-50">
                <img src="/logo.png" alt="Hispaloshop" className="h-7 w-7 object-contain" loading="lazy" />
              </div>
              <div className="min-w-0">
                <span className="block font-body text-base font-semibold tracking-tight text-stone-950 md:text-lg">
                  Hispaloshop
                </span>
                <span className="hidden text-xs text-stone-500 md:block">
                  {t('nav.tagline', 'Alimentación honesta y social commerce claro')}
                </span>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 lg:flex" aria-label={t('nav.mainNavigation', 'Navegación principal')}>
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-full px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950"
                >
                  {t(item.labelKey, item.fallback)}
                </Link>
              ))}
            </nav>

            <form onSubmit={runSearch} className="hidden min-w-0 flex-1 xl:flex">
              <div className="relative w-full max-w-2xl">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <Input
                  aria-label={t('nav.search', 'Buscar')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('nav.searchPlaceholder', 'Buscar productos, marcas o tiendas')}
                  className="h-11 w-full rounded-full border border-stone-200 bg-stone-50 pl-11 pr-4 text-sm focus:border-stone-950"
                  data-testid="header-search-input"
                />
              </div>
            </form>

            <div className="relative ml-auto flex items-center gap-1.5 md:gap-2" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMobileSearchOpen((current) => !current)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-transparent text-stone-700 transition-colors hover:border-stone-200 hover:bg-stone-50 xl:hidden"
                aria-label={t('nav.search', 'Buscar')}
                aria-expanded={mobileSearchOpen}
                data-testid="mobile-search-toggle"
              >
                <Search className="h-5 w-5" />
              </button>

              <Link
                to="/cart"
                className="relative flex h-11 w-11 items-center justify-center rounded-full border border-transparent text-stone-700 transition-colors hover:border-stone-200 hover:bg-stone-50"
                aria-label={
                  totalItems > 0
                    ? t('nav.cartWithItems', 'Cesta, {{count}} artículos', { count: totalItems })
                    : t('nav.cart', 'Cesta')
                }
                data-testid="cart-button"
              >
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-stone-950 px-1 text-[10px] font-bold text-white">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                ) : null}
              </Link>

              {user ? (
                <Link
                  to={dashboardUrl}
                  className="hidden items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-100 md:flex"
                >
                  <User className="h-4 w-4" />
                  <span className="max-w-[110px] truncate">{firstName}</span>
                </Link>
              ) : (
                <>
                  <Link to="/login" className="hidden md:block">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 rounded-full px-4 text-sm text-stone-700 hover:bg-stone-100 hover:text-stone-950"
                    >
                      {t('auth.login', 'Iniciar sesión')}
                    </Button>
                  </Link>
                  <Link to="/register/new" className="hidden md:block">
                    <Button size="sm" className="h-10 rounded-full bg-stone-950 px-5 text-sm text-white hover:bg-stone-800">
                      {t('auth.createAccount', 'Crear cuenta')}
                    </Button>
                  </Link>
                </>
              )}

              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
                  menuOpen
                    ? 'border-stone-300 bg-stone-100 text-stone-950'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                }`}
                aria-label={menuOpen ? t('nav.closeMenu', 'Cerrar menú') : t('nav.openMenu', 'Abrir menú')}
                aria-expanded={menuOpen}
                data-testid="hamburger-menu-button"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              {menuOpen ? (
                <div
                  className="absolute right-0 top-[68px] z-[120] w-[320px] overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_20px_50px_rgba(15,15,15,0.16)] md:top-[82px]"
                  data-testid="hamburger-menu-panel"
                >
                  <div className="border-b border-stone-100 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      {t('nav.menuTitle', 'Navega por Hispaloshop')}
                    </p>
                  </div>

                  <div className="space-y-1 px-3 py-3">
                    {mobileMenuLinks.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-950"
                      >
                        <span>{t(item.labelKey, item.fallback)}</span>
                        <ChevronRight className="h-4 w-4 text-stone-400" />
                      </Link>
                    ))}
                  </div>

                  <div className="border-t border-stone-100 px-5 py-3">
                    <Link
                      to="/settings/locale"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-stone-400" />
                        <span>{t('locale.settings', 'Idioma y región')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-stone-500">
                        <span className="text-xs">{country || 'ES'} · {(language || 'es').toUpperCase()} · {currency || 'EUR'}</span>
                        <ChevronRight className="h-4 w-4 text-stone-400" />
                      </div>
                    </Link>
                  </div>

                  <div className="border-t border-stone-100 px-5 py-4">
                    {user ? (
                      <div className="space-y-2">
                        <Link to={dashboardUrl} onClick={() => setMenuOpen(false)}>
                          <Button className="h-11 w-full rounded-full bg-stone-950 text-white hover:bg-stone-800">
                            <LayoutDashboard className="h-4 w-4" />
                            {t('nav.goToDashboard', 'Ir a mi panel')}
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          onClick={handleLogout}
                          className="h-11 w-full rounded-full border-stone-300 text-stone-700 hover:bg-stone-50"
                        >
                          {t('auth.logout', 'Cerrar sesión')}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Link to="/register/new" onClick={() => setMenuOpen(false)}>
                          <Button className="h-11 w-full rounded-full bg-stone-950 text-white hover:bg-stone-800">
                            {t('auth.createAccount', 'Crear cuenta')}
                          </Button>
                        </Link>
                        <Link to="/login" onClick={() => setMenuOpen(false)}>
                          <Button
                            variant="outline"
                            className="h-11 w-full rounded-full border-stone-300 text-stone-700 hover:bg-stone-50"
                          >
                            {t('auth.login', 'Iniciar sesión')}
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {mobileSearchOpen ? (
            <form onSubmit={runSearch} className="border-t border-stone-100 pb-4 pt-3 xl:hidden">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <Input
                  aria-label={t('nav.search', 'Buscar')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('nav.searchPlaceholder', 'Buscar productos, marcas o tiendas')}
                  className="h-11 w-full rounded-full border-stone-200 bg-stone-50 pl-11 pr-4 text-sm focus:border-stone-950"
                />
              </div>
            </form>
          ) : null}
        </div>
      </header>
    </>
  );
}
