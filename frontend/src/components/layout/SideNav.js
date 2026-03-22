import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../brand/Logo';
import {
  Home,
  Compass,
  Plus,
  User,
  ShoppingCart,
  Bell,
  Search,
  MessageCircle,
  Users,
  Store,
  X,
  MoreHorizontal,
  Settings,
  Bookmark,
  Activity,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useTranslation } from 'react-i18next';
import { useUnreadNotifications } from '../../hooks/api/useNotifications';
import apiClient from '../../services/api/client';

/* ── Locale Dropdowns ── */
const LANGS = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
];
const COUNTRIES = [
  { code: 'ES', label: 'España' },
  { code: 'PT', label: 'Portugal' },
  { code: 'FR', label: 'Francia' },
  { code: 'DE', label: 'Alemania' },
  { code: 'IT', label: 'Italia' },
  { code: 'US', label: 'EE.UU.' },
];
const CURRENCIES = [
  { code: 'EUR', label: '€ EUR' },
  { code: 'USD', label: '$ USD' },
  { code: 'GBP', label: '£ GBP' },
];

function LocaleDropdowns() {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'es');
  const [country, setCountry] = useState(() => localStorage.getItem('country') || 'ES');
  const [currency, setCurrency] = useState(() => localStorage.getItem('currency') || 'EUR');

  const handleChange = (key, value) => {
    localStorage.setItem(key, value);
    if (key === 'lang') setLang(value);
    if (key === 'country') setCountry(value);
    if (key === 'currency') setCurrency(value);
  };

  const selectClass =
    'w-full text-xs text-stone-600 bg-transparent border border-stone-200 rounded-xl px-2 py-1.5 focus:outline-none focus:border-stone-400 cursor-pointer';

  return (
    <div className="px-3 pb-3 space-y-1.5 border-t border-stone-100 pt-3">
      <select
        value={lang}
        onChange={e => handleChange('lang', e.target.value)}
        className={selectClass}
        aria-label="Idioma"
      >
        {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-1.5">
        <select
          value={country}
          onChange={e => handleChange('country', e.target.value)}
          className={selectClass}
          aria-label="País"
        >
          {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
        <select
          value={currency}
          onChange={e => handleChange('currency', e.target.value)}
          className={selectClass}
          aria-label="Moneda"
        >
          {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { key: 'home',          to: '/',              icon: Home,          labelKey: 'nav.home',          fallback: 'Inicio' },
  { key: 'search',        to: null,             icon: Search,        labelKey: 'nav.search',        fallback: 'Buscar' },
  { key: 'explore',       to: '/discover',      icon: Compass,       labelKey: 'nav.explore',       fallback: 'Explorar' },
  { key: 'stores',        to: '/stores',        icon: Store,         labelKey: 'nav.stores',        fallback: 'Tiendas' },
  { key: 'messages',      to: '/messages',      icon: MessageCircle, labelKey: 'nav.messages',      fallback: 'Mensajes' },
  { key: 'communities',   to: '/communities',   icon: Users,         labelKey: 'nav.communities',   fallback: 'Comunidades' },
  { key: 'notifications', to: '/notifications', icon: Bell,          labelKey: 'nav.notifications', fallback: 'Notificaciones' },
];

/* ── Search Panel (Instagram-style overlay) ── */
function SearchPanel({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!open) { setQuery(''); setResults([]); }
  }, [open]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('hispal_recent_searches');
      if (raw) setRecent(JSON.parse(raw).slice(0, 8));
    } catch { /* ignore */ }
  }, [open]);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      // Search products + users in parallel
      const [productsRes, usersRes] = await Promise.allSettled([
        apiClient.get('/products', { params: { search: q, limit: 5 } }),
        apiClient.get('/discovery/search-users', { params: { q, limit: 5 } }),
      ]);
      const products = (productsRes.status === 'fulfilled'
        ? (productsRes.value?.products || productsRes.value?.data || [])
        : []).map(p => ({ ...p, _type: 'product' }));
      const users = (usersRes.status === 'fulfilled'
        ? (usersRes.value?.users || usersRes.value || [])
        : []).map(u => ({ ...u, _type: 'user' }));
      setResults([...users.slice(0, 4), ...products.slice(0, 4)]);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 300);
  };

  const saveRecent = (term) => {
    try {
      const updated = [term, ...recent.filter(r => r !== term)].slice(0, 8);
      localStorage.setItem('hispal_recent_searches', JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const goTo = (path, term) => {
    if (term) saveRecent(term);
    navigate(path);
    onClose();
  };

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-[45]" onClick={onClose} />}

      {/* Panel */}
      <div
        className="fixed top-0 z-[46] flex flex-col bg-white border-r border-stone-200 shadow-xl transition-transform duration-200 ease-out"
        style={{
          left: '220px',
          width: 380,
          height: '100vh',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="text-lg font-semibold text-stone-950 tracking-tight">Buscar</h2>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-stone-100 transition-colors bg-transparent border-none cursor-pointer">
            <X size={18} className="text-stone-500" />
          </button>
        </div>

        {/* Search input */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              ref={inputRef}
              value={query}
              onChange={handleInput}
              placeholder="Buscar productos, personas, tiendas..."
              data-search-input
              className="w-full h-10 pl-9 pr-3 bg-stone-100 border-none rounded-2xl text-sm text-stone-950 outline-none focus:ring-2 focus:ring-stone-300 font-sans placeholder:text-stone-400"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 border-2 border-stone-200 border-t-stone-950 rounded-full animate-spin" />
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <p className="text-center text-sm text-stone-400 py-8">Sin resultados para "{query}"</p>
          )}

          {!loading && results.map((item, i) => {
            if (item._type === 'user') {
              const username = item.username || item.user_id;
              return (
                <button
                  key={`u-${item.user_id || i}`}
                  onClick={() => goTo(`/${username}`, item.name || username)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl hover:bg-stone-50 text-left bg-transparent border-none cursor-pointer transition-colors"
                >
                  {item.profile_image ? (
                    <img src={item.profile_image} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-600">
                      {(item.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-950 truncate">{item.name || item.full_name}</p>
                    {username && <p className="text-xs text-stone-400 truncate">@{username}</p>}
                  </div>
                </button>
              );
            }
            // Product
            return (
              <button
                key={`p-${item.product_id || i}`}
                onClick={() => goTo(`/products/${item.product_id}`, item.name)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl hover:bg-stone-50 text-left bg-transparent border-none cursor-pointer transition-colors"
              >
                {item.images?.[0] ? (
                  <img src={item.images[0]} alt="" className="h-10 w-10 rounded-2xl object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-2xl bg-stone-100 flex items-center justify-center">
                    <ShoppingCart size={14} className="text-stone-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-950 truncate">{item.name}</p>
                  {(item.unit_price_cents != null || item.price != null) && <p className="text-xs text-stone-500">{(item.unit_price_cents != null ? (item.unit_price_cents / 100).toFixed(2) : Number(item.price).toFixed(2))} €</p>}
                </div>
              </button>
            );
          })}

          {/* Recent searches (when no query) */}
          {!query && recent.length > 0 && (
            <div className="px-2 pt-2">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2 px-1">Recientes</p>
              {recent.map((term, i) => (
                <button
                  key={i}
                  onClick={() => { setQuery(term); doSearch(term); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-2xl hover:bg-stone-50 text-left bg-transparent border-none cursor-pointer text-sm text-stone-700 transition-colors"
                >
                  <Search size={14} className="text-stone-400 flex-shrink-0" />
                  <span className="truncate">{term}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── "Más" Dropdown ── */
function MoreDropdown({ open, onClose, onLogout }) {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const items = [
    { icon: Settings, label: 'Configuración', action: () => navigate('/settings') },
    { icon: Bookmark, label: 'Guardados', action: () => navigate('/saved') },
    { icon: Activity, label: 'Tu actividad', action: () => navigate('/activity') },
    { divider: true },
    { icon: LogOut, label: 'Cerrar sesión', action: onLogout, danger: true },
  ];

  return (
    <div
      ref={dropdownRef}
      className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-2xl border border-stone-200 shadow-lg overflow-hidden z-50"
    >
      {items.map((item, i) => {
        if (item.divider) {
          return <div key={`d-${i}`} className="border-t border-stone-100 my-1" />;
        }
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            onClick={() => { item.action(); onClose(); }}
            className={`flex items-center gap-3 w-full px-4 py-3 text-left text-sm bg-transparent border-none cursor-pointer font-sans transition-colors hover:bg-stone-50 ${
              item.danger ? 'text-stone-950' : 'text-stone-700'
            }`}
          >
            <Icon size={18} strokeWidth={1.6} className={item.danger ? 'text-stone-950' : 'text-stone-500'} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── SideNav ── */
export default function SideNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { getTotalItems } = useCart();
  const { data: unreadData } = useUnreadNotifications();
  const unreadCount = user ? (unreadData?.count ?? 0) : 0;
  const totalCartItems = getTotalItems();

  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const profileUsername = user?.username || null;
  const profileUrl = profileUsername ? `/${profileUsername}` : (user?.user_id ? `/profile/${user.user_id}` : '/login');
  const profileImage = user?.profile_image || user?.avatar_url || null;

  const isActive = (path) => {
    if (!path) return false;
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = useCallback(async () => {
    try {
      if (logout) await logout();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  }, [logout, navigate]);

  // Close search and more on route change
  useEffect(() => { setSearchOpen(false); setMoreOpen(false); }, [location.pathname]);

  return (
    <>
      <aside className="fixed left-0 top-0 bottom-0 z-40 hidden lg:flex w-[220px] flex-col border-r bg-white"
        style={{ borderColor: '#e7e5e4' }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-stone-200 bg-stone-50">
            <Logo variant="icon" theme="light" size={20} />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-stone-950">Hispaloshop</span>
        </Link>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isSearch = item.key === 'search';
            const active = isSearch ? searchOpen : isActive(item.to);
            const Icon = item.icon;

            if (isSearch) {
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSearchOpen(v => !v)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[14px] transition-colors bg-transparent border-none cursor-pointer font-sans ${
                    active
                      ? 'font-semibold text-stone-950'
                      : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0"
                    strokeWidth={active ? 2.2 : 1.6}
                  />
                  <span>{t(item.labelKey, item.fallback)}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.key}
                to={item.to}
                className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] transition-colors ${
                  active
                    ? 'font-semibold text-stone-950'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Icon className="h-5 w-5"
                    strokeWidth={active ? 2.2 : 1.6}
                  />
                  {item.key === 'notifications' && unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-stone-950 px-0.5 text-[8px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span>{t(item.labelKey, item.fallback)}</span>
              </Link>
            );
          })}

          {/* Cart */}
          <Link
            to="/cart"
            className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] transition-colors ${
              isActive('/cart')
                ? 'font-semibold text-stone-950'
                : 'text-stone-700 hover:bg-stone-50'
            }`}
          >
            <div className="relative flex-shrink-0">
              <ShoppingCart className="h-5 w-5" strokeWidth={isActive('/cart') ? 2.2 : 1.6} />
              {totalCartItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-stone-950 px-0.5 text-[8px] font-bold text-white">
                  {totalCartItems > 9 ? '9+' : totalCartItems}
                </span>
              )}
            </div>
            <span>{t('nav.cart', 'Cesta')}</span>
          </Link>

          {/* Create button — pill CTA */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-creator'))}
            className="flex w-full items-center justify-center gap-2 mt-3 bg-stone-950 text-white rounded-full py-2.5 px-4 text-[14px] font-semibold border-none cursor-pointer transition-colors hover:bg-stone-800 font-sans"
          >
            <Plus className="h-5 w-5" strokeWidth={2.2} />
            <span>{t('nav.create', 'Crear')}</span>
          </button>
        </nav>

        {/* Locale: language / country / currency */}
        <LocaleDropdowns />

        {/* Profile link — avatar (28px) + username */}
        <div className="px-3 pb-1">
          <Link
            to={profileUrl}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] transition-colors ${
              isActive(profileUrl)
                ? 'font-semibold text-stone-950'
                : 'text-stone-700 hover:bg-stone-50'
            }`}
          >
            {profileImage ? (
              <img src={profileImage} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-stone-200 flex-shrink-0" />
            ) : (
              <div className="h-7 w-7 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-stone-500" strokeWidth={1.6} />
              </div>
            )}
            <span className="truncate">
              {user?.username || user?.name || user?.full_name || t('nav.profile', 'Perfil')}
            </span>
          </Link>
        </div>

        {/* "Más" menu trigger */}
        <div className="relative px-3 pb-3">
          <button
            type="button"
            onClick={() => setMoreOpen(v => !v)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[14px] transition-colors bg-transparent border-none cursor-pointer font-sans ${
              moreOpen ? 'bg-stone-100 text-stone-950' : 'text-stone-700 hover:bg-stone-50'
            }`}
          >
            <MoreHorizontal className="h-5 w-5 flex-shrink-0" strokeWidth={1.6} />
            <span>Más</span>
          </button>
          <MoreDropdown open={moreOpen} onClose={() => setMoreOpen(false)} onLogout={handleLogout} />
        </div>
      </aside>

      {/* Search panel overlay — only mount on lg+ when open */}
      {searchOpen && (
        <div className="hidden lg:block">
          <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
        </div>
      )}
    </>
  );
}
