import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingCart, X, Package, Store, FileCheck, ChefHat, LayoutDashboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import LocaleSelector from './LocaleSelector';

function getDashboardUrl(role) {
  switch (role) {
    case 'super_admin':
      return '/super-admin';
    case 'admin':
      return '/admin';
    case 'producer':
    case 'importer':
      return '/producer';
    case 'influencer':
      return '/influencer/dashboard';
    default:
      return '/dashboard';
  }
}

export default function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { getTotalItems } = useCart();

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onOutside = (event) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [menuOpen]);

  const runSearch = (event) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;

    if (scope === 'products') {
      navigate(`/products?search=${encodeURIComponent(q)}`);
    } else if (scope === 'stores') {
      navigate(`/stores?search=${encodeURIComponent(q)}`);
    } else if (scope === 'profiles') {
      navigate(`/discover?scope=profiles&search=${encodeURIComponent(q)}`);
    } else {
      navigate(`/discover?search=${encodeURIComponent(q)}`);
    }

    setMobileSearchOpen(false);
  };

  const menuItems = [
    { to: '/recipes', icon: ChefHat, label: 'Recetas' },
    { to: user ? getDashboardUrl(user.role) : '/login', icon: LayoutDashboard, label: 'Panel' },
    { to: '/products', icon: Package, label: 'Productos' },
    { to: '/stores', icon: Store, label: 'Tiendas' },
    { to: '/certificates', icon: FileCheck, label: 'Certificados' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#FAF7F2]/95 backdrop-blur border-b border-stone-200" data-testid="main-header">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6">
        <div className="h-14 md:h-16 flex items-center gap-2 md:gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0" data-testid="logo-link">
            <img src="/logo.png" alt="Hispaloshop" className="w-7 h-7 md:w-8 md:h-8 object-contain" />
            <span className="font-heading text-lg md:text-xl font-semibold text-[#1C1C1C] tracking-[0.02em]">Hispaloshop</span>
          </Link>

          <form onSubmit={runSearch} className="hidden md:flex flex-1 max-w-2xl ml-3">
            <div className="flex w-full rounded-full border border-stone-200 bg-white overflow-hidden">
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="px-3 text-sm bg-stone-50 border-r border-stone-200 outline-none"
                aria-label="Ambito de busqueda"
              >
                <option value="all">Todo</option>
                <option value="products">Productos</option>
                <option value="profiles">Perfiles</option>
                <option value="stores">Tiendas</option>
              </select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar productos, perfiles o tiendas"
                  className="h-10 border-0 rounded-none pl-10 pr-3 bg-transparent"
                  data-testid="header-search-input"
                />
              </div>
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1 md:gap-2" ref={menuRef}>
            <div className="hidden md:block">
              <LocaleSelector compact />
            </div>

            <button
              type="button"
              onClick={() => setMobileSearchOpen((p) => !p)}
              className="md:hidden p-2 rounded-full hover:bg-stone-100"
              data-testid="mobile-search-toggle"
            >
              <Search className="w-5 h-5 text-stone-700" />
            </button>

            <Link to="/cart" className="relative p-2 rounded-full hover:bg-stone-100" data-testid="cart-button">
              <ShoppingCart className="w-5 h-5 text-stone-700" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {getTotalItems() > 9 ? '9+' : getTotalItems()}
                </span>
              )}
            </Link>

            {!user ? (
              <>
                <Link to="/login" className="hidden md:block">
                  <Button variant="ghost" size="sm">Iniciar sesion</Button>
                </Link>
                <Link to="/signup" className="hidden md:block">
                  <Button size="sm" className="bg-[#1C1C1C] text-white hover:bg-[#2A2A2A] rounded-full">Registrarse</Button>
                </Link>
              </>
            ) : (
              <button onClick={logout} className="hidden md:inline-flex px-3 py-2 text-sm rounded-full hover:bg-stone-100 text-stone-700">
                Salir
              </button>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen((p) => !p)}
              className={`p-2 rounded-full transition-colors ${menuOpen ? 'bg-stone-200' : 'hover:bg-stone-100'}`}
              data-testid="hamburger-menu-button"
            >
              {menuOpen ? <X className="w-5 h-5 text-stone-700" /> : <Menu className="w-5 h-5 text-stone-700" />}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-[56px] md:top-[64px] w-72 rounded-2xl border border-stone-200 bg-white shadow-xl overflow-hidden z-[120]" data-testid="hamburger-menu-panel">
                <div className="p-2">
                  {menuItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-stone-50 text-sm text-stone-700"
                    >
                      <item.icon className="w-4 h-4 text-[#2D5A27]" />
                      {item.label}
                    </Link>
                  ))}
                </div>
                <div className="border-t border-stone-100 p-3 md:hidden">
                  <LocaleSelector />
                </div>
              </div>
            )}
          </div>
        </div>

        {mobileSearchOpen && (
          <form onSubmit={runSearch} className="md:hidden pb-3 animate-in slide-in-from-top-1 duration-150">
            <div className="flex gap-2">
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="h-10 px-2 rounded-lg border border-stone-200 bg-white text-sm"
              >
                <option value="all">Todo</option>
                <option value="products">Productos</option>
                <option value="profiles">Perfiles</option>
                <option value="stores">Tiendas</option>
              </select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="h-10 pl-10 rounded-lg border-stone-200 bg-white"
                />
              </div>
            </div>
          </form>
        )}
      </div>
    </header>
  );
}

