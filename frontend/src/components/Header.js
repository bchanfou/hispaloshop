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
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getDefaultRoute } from '../lib/navigation';
import { Button } from './ui/button';
import { Input } from './ui/input';
import LocaleSelector from './LocaleSelector';

const NAV_LINKS = [
  { label: 'Explorar', to: '/discover' },
  { label: 'Productos', to: '/products' },
  { label: 'Tiendas', to: '/stores' },
  { label: 'Certificados', to: '/certificates' },
];

const MOBILE_MENU_LINKS = [
  ...NAV_LINKS,
  { label: 'Qué es Hispaloshop', to: '/about' },
];

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { getTotalItems } = useCart();

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const totalItems = getTotalItems();
  const dashboardUrl = user ? getDefaultRoute(user, user.onboarding_completed) : '/login';
  const firstName = useMemo(() => {
    const raw = user?.name || user?.full_name || user?.username || '';
    return raw.trim().split(' ')[0] || 'Mi cuenta';
  }, [user]);

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
  }, [menuOpen]);

  const runSearch = (event) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;

    if (scope === 'products') {
      navigate(`/products?search=${encodeURIComponent(value)}`);
    } else if (scope === 'stores') {
      navigate(`/stores?search=${encodeURIComponent(value)}`);
    } else if (scope === 'profiles') {
      navigate(`/discover?scope=profiles&search=${encodeURIComponent(value)}`);
    } else {
      navigate(`/discover?search=${encodeURIComponent(value)}`);
    }

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
        Saltar al contenido principal
      </a>

      <header
        className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/92 backdrop-blur-xl"
        data-testid="main-header"
      >
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="flex h-16 items-center gap-3 md:h-[76px] md:gap-5">
            <Link to="/" className="flex shrink-0 items-center gap-3" data-testid="logo-link">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-stone-50">
                <img src="/logo.png" alt="Hispaloshop" className="h-7 w-7 object-contain" />
              </div>
              <div className="min-w-0">
                <span className="block font-body text-base font-semibold tracking-tight text-stone-950 md:text-lg">
                  Hispaloshop
                </span>
                <span className="hidden text-xs text-stone-500 md:block">
                  Alimentación honesta y social commerce claro
                </span>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 lg:flex">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-full px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <form onSubmit={runSearch} className="hidden min-w-0 flex-1 xl:flex">
              <div className="flex w-full max-w-2xl items-center overflow-hidden rounded-full border border-stone-200 bg-stone-50">
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="h-11 border-r border-stone-200 bg-transparent px-4 text-sm font-medium text-stone-700 outline-none"
                  aria-label="Ámbito de búsqueda"
                >
                  <option value="all">Todo</option>
                  <option value="products">Productos</option>
                  <option value="profiles">Perfiles</option>
                  <option value="stores">Tiendas</option>
                </select>
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar productos, tiendas o perfiles"
                    className="h-11 border-0 bg-transparent pl-11 pr-4 text-sm"
                    data-testid="header-search-input"
                  />
                </div>
              </div>
            </form>

            <div className="relative ml-auto flex items-center gap-1.5 md:gap-2" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMobileSearchOpen((current) => !current)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-stone-700 transition-colors hover:border-stone-200 hover:bg-stone-50 xl:hidden"
                aria-label="Buscar"
                aria-expanded={mobileSearchOpen}
                data-testid="mobile-search-toggle"
              >
                <Search className="h-5 w-5" />
              </button>

              <Link
                to="/cart"
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-stone-700 transition-colors hover:border-stone-200 hover:bg-stone-50"
                aria-label={totalItems > 0 ? `Cesta, ${totalItems} artículos` : 'Cesta'}
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
                      Iniciar sesión
                    </Button>
                  </Link>
                  <Link to="/register/new" className="hidden md:block">
                    <Button size="sm" className="h-10 rounded-full bg-stone-950 px-5 text-sm text-white hover:bg-stone-800">
                      Crear cuenta
                    </Button>
                  </Link>
                </>
              )}

              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                  menuOpen
                    ? 'border-stone-300 bg-stone-100 text-stone-950'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                }`}
                aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
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
                      Navega por Hispaloshop
                    </p>
                  </div>

                  <div className="space-y-1 px-3 py-3">
                    {MOBILE_MENU_LINKS.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-950"
                      >
                        <span>{item.label}</span>
                        <ChevronRight className="h-4 w-4 text-stone-400" />
                      </Link>
                    ))}
                  </div>

                  <div className="border-t border-stone-100 px-5 py-4">
                    <div className="mb-4 flex items-center gap-2 text-sm font-medium text-stone-700">
                      <Globe className="h-4 w-4 text-stone-500" />
                      Idioma
                    </div>
                    <LocaleSelector />
                  </div>

                  <div className="border-t border-stone-100 px-5 py-4">
                    {user ? (
                      <div className="space-y-2">
                        <Link to={dashboardUrl} onClick={() => setMenuOpen(false)}>
                          <Button className="h-11 w-full rounded-full bg-stone-950 text-white hover:bg-stone-800">
                            <LayoutDashboard className="h-4 w-4" />
                            Ir a mi panel
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          onClick={handleLogout}
                          className="h-11 w-full rounded-full border-stone-300 text-stone-700 hover:bg-stone-50"
                        >
                          Cerrar sesión
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Link to="/register/new" onClick={() => setMenuOpen(false)}>
                          <Button className="h-11 w-full rounded-full bg-stone-950 text-white hover:bg-stone-800">
                            Crear cuenta
                          </Button>
                        </Link>
                        <Link to="/login" onClick={() => setMenuOpen(false)}>
                          <Button
                            variant="outline"
                            className="h-11 w-full rounded-full border-stone-300 text-stone-700 hover:bg-stone-50"
                          >
                            Iniciar sesión
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
              <div className="flex gap-2">
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="h-11 rounded-2xl border border-stone-200 bg-stone-50 px-3 text-sm font-medium text-stone-700"
                  aria-label="Ámbito de búsqueda móvil"
                >
                  <option value="all">Todo</option>
                  <option value="products">Productos</option>
                  <option value="profiles">Perfiles</option>
                  <option value="stores">Tiendas</option>
                </select>
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar en Hispaloshop"
                    className="h-11 rounded-2xl border-stone-200 bg-stone-50 pl-11"
                  />
                </div>
              </div>
            </form>
          ) : null}
        </div>
      </header>
    </>
  );
}
