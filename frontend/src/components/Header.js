import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../utils/api';
import { ShoppingCart, User, Menu, Search, X, Home, Package, Store, FileCheck, LogIn, Compass, Moon, Bell, MessageSquare, ChefHat, Zap, Star, UserPlus, Wallet, CheckCircle, XCircle, TrendingDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLocale } from '../context/LocaleContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import LocaleSelector from './LocaleSelector';

// Helper function to get dashboard URL based on user role
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
    case 'customer':
    default:
      return '/dashboard';
  }
}

function NotificationsBell({ user, t }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  
  useEffect(() => {
    axios.get(`${API}/user/notifications`, { withCredentials: true })
      .then(r => {
        const items = r.data?.notifications || r.data || [];
        setNotifs(items.slice(0, 8));
        setUnread(items.filter(n => !n.read).length);
      })
      .catch(() => {});
  }, []);

  const markAllRead = async () => {
    try {
      await axios.put(`${API}/user/notifications/read-all`, {}, { withCredentials: true });
      setUnread(0);
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const iconMap = {
    order_received: <Package className="w-4 h-4 text-stone-600" />,
    new_follower: <UserPlus className="w-4 h-4 text-stone-600" />,
    new_review: <Star className="w-4 h-4 text-amber-500" />,
    payout: <Wallet className="w-4 h-4 text-green-600" />,
    new_product: <Store className="w-4 h-4 text-stone-600" />,
    predict_overdue: <Zap className="w-4 h-4 text-red-500" />,
    product_approved: <CheckCircle className="w-4 h-4 text-green-500" />,
    product_rejected: <XCircle className="w-4 h-4 text-red-500" />,
    price_drop: <TrendingDown className="w-4 h-4 text-emerald-600" />,
  };

  return (
    <div className="relative" data-testid="notifications-bell">
      <button onClick={() => { setOpen(!open); if (!open && unread > 0) markAllRead(); }} className="p-2 hover:bg-stone-100 rounded-full transition-colors relative">
        <Bell className="w-5 h-5 text-text-secondary" strokeWidth={1.5} />
        {unread > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-lg border border-stone-200 z-50 overflow-hidden" data-testid="notif-dropdown">
            <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
              <span className="text-sm font-semibold">{t('notifications.title')}</span>
              {unread > 0 && <button onClick={markAllRead} className="text-xs text-[#2D5A27] hover:underline">{t('notifications.markRead')}</button>}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="py-8 text-center text-sm text-text-muted">{t('notifications.empty')}</div>
              ) : notifs.map((n, i) => (
                <Link 
                  key={i} 
                  to={n.link || '#'}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 border-b border-stone-50 hover:bg-stone-50 transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}
                  data-testid={`notif-item-${n.type || 'generic'}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {iconMap[n.type] || <Bell className="w-4 h-4 text-stone-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {n.title && <p className="text-xs font-medium text-stone-900 line-clamp-1">{n.title}</p>}
                      <p className="text-xs text-stone-500 line-clamp-2">{n.message || n.content?.message || n.type?.replace('_', ' ') || t('notifications.newNotification')}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">{n.created_at ? new Date(n.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const { getTotalItems, cartItems, getCartTotal } = useCart();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Initialize dark mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const navItems = [
    { to: '/products', icon: Package, label: t('header.products') },
    { to: '/stores', icon: Store, label: t('header.stores') },
    { to: '/discover', icon: Compass, label: t('header.discover', 'Descubre') },
    { to: '/recipes', icon: ChefHat, label: t('header.recipes', 'Recetas') },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border-default" data-testid="main-header">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0" data-testid="logo-link">
              <img src="/logo.png" alt="Hispaloshop" className="w-7 h-7 md:w-8 md:h-8 object-contain" />
              <span className="font-heading text-lg md:text-xl font-semibold text-text-primary tracking-editorial">Hispaloshop</span>
            </Link>

            {/* Desktop Navigation — takes the space freed from removed search bar */}
            <nav className="hidden md:flex items-center space-x-6 ml-8">
              {navItems.map((item) => (
                <Link 
                  key={item.to}
                  to={item.to} 
                  className="font-body text-sm font-medium text-text-secondary hover:text-text-primary transition-colors" 
                  data-testid={`nav-${item.to.slice(1)}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-2">
              <LocaleSelector />
              
              <div className="h-5 w-px bg-border-default mx-2" />
              
              {/* Dark mode toggle */}
              <button
                onClick={() => {
                  const current = document.documentElement.getAttribute('data-theme');
                  const next = current === 'dark' ? 'light' : 'dark';
                  document.documentElement.setAttribute('data-theme', next);
                  localStorage.setItem('theme', next);
                }}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                data-testid="dark-mode-toggle"
                aria-label="Toggle dark mode"
              >
                <Moon className="w-4 h-4 text-text-secondary" strokeWidth={1.5} />
              </button>

              {/* Messages icon */}
              {user && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('toggle-chat'))}
                  className="p-2 hover:bg-stone-100 rounded-full transition-colors relative"
                  data-testid="messages-icon"
                >
                  <MessageSquare className="w-5 h-5 text-text-secondary" strokeWidth={1.5} />
                </button>
              )}

              {/* Notifications bell with dropdown */}
              {user && (
                <NotificationsBell user={user} t={t} />
              )}

              {/* Mini-Cart with hover preview */}
              <div className="relative group" data-testid="mini-cart">
                <Link to="/cart" className="relative p-2 hover:bg-stone-100 rounded-full transition-colors" data-testid="cart-button">
                  <ShoppingCart className="w-5 h-5 text-text-secondary" strokeWidth={1.5} />
                  {getTotalItems() > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-pulse" data-testid="cart-count">
                      {getTotalItems() > 9 ? '9+' : getTotalItems()}
                    </span>
                  )}
                </Link>
                {/* Hover preview dropdown */}
                {getTotalItems() > 0 && (
                  <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl shadow-lg border border-stone-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 hidden md:block">
                    <div className="p-3 border-b border-stone-100">
                      <p className="text-xs font-semibold text-text-primary">{getTotalItems()} {t('cart.itemsInCart')}</p>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-2">
                      {(cartItems || []).slice(0, 3).map((item, i) => (
                        <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg">
                          <div className="w-8 h-8 rounded bg-stone-100 shrink-0 overflow-hidden">
                            {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-text-primary truncate">{item.product_name}</p>
                            <p className="text-[10px] text-text-muted">{item.quantity}x {item.price?.toFixed(2)}€</p>
                          </div>
                        </div>
                      ))}
                      {(cartItems || []).length > 3 && <p className="text-[10px] text-text-muted text-center py-1">+{cartItems.length - 3} {t('cart.more')}</p>}
                    </div>
                    <Link to="/cart" className="block p-2.5 text-center text-xs font-semibold text-white bg-[#1C1C1C] hover:bg-[#2D5A27] rounded-b-xl transition-colors">
                      {t('cart.viewCart')} · {getCartTotal?.()?.toFixed(2) || '0.00'}€
                    </Link>
                  </div>
                )}
              </div>

              {user ? (
                <div className="flex items-center space-x-2">
                  <Link
                    to={getDashboardUrl(user.role)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-stone-100 rounded-full transition-colors"
                    data-testid="dashboard-link"
                  >
                    <User className="w-5 h-5 text-text-secondary" strokeWidth={1.5} />
                    <span className="font-body text-sm text-text-secondary max-w-[100px] truncate">{user.name}</span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    data-testid="logout-button"
                    className="font-body text-sm text-text-muted hover:text-text-primary"
                  >
                    {t('header.logout')}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link to="/login">
                    <Button variant="ghost" size="sm" data-testid="login-button" className="font-body text-sm">
                      {t('header.login')}
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button size="sm" data-testid="register-button" className="font-body text-sm bg-ds-primary text-white hover:bg-ds-primary/90 rounded-full px-4">
                      {t('header.signup')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Actions */}
            <div className="md:hidden flex items-center gap-1">
              {/* Mobile Search Toggle */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                data-testid="mobile-search-toggle"
              >
                <Search className="w-5 h-5 text-text-primary" strokeWidth={1.5} />
              </button>

              {/* Mobile Cart */}
              <Link to="/cart" className="relative p-2 hover:bg-stone-100 rounded-full transition-colors" data-testid="mobile-cart-button">
                <ShoppingCart className="w-5 h-5 text-text-primary" strokeWidth={1.5} />
                {getTotalItems() > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-ds-accent text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full" data-testid="mobile-cart-count">
                    {getTotalItems() > 9 ? '9+' : getTotalItems()}
                  </span>
                )}
              </Link>
              
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                data-testid="mobile-menu-button"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-text-primary" strokeWidth={1.5} />
                ) : (
                  <Menu className="w-5 h-5 text-text-primary" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Search Bar - Expandable */}
          {searchOpen && (
            <div className="md:hidden pb-3 animate-slide-down">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <Input
                  type="text"
                  placeholder={t('header.searchPlaceholder', 'Buscar productos...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 rounded-full border-border-default bg-white w-full"
                  autoFocus
                  data-testid="mobile-search-input"
                />
              </form>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Menu - Bottom Sheet Style */}
      {mobileMenuOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed bottom-0 left-0 right-0 bg-white z-50 md:hidden rounded-t-2xl animate-slide-up shadow-floating" data-testid="mobile-menu-panel">
            {/* Handle */}
            <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mt-3 mb-2" />
            
            <nav className="p-4 pb-safe">
              {/* Navigation Links */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <Link 
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  <Home className="w-5 h-5 text-text-secondary" strokeWidth={1.5} />
                  <span className="text-xs text-text-secondary">{t('header.home', 'Inicio')}</span>
                </Link>
                {navItems.map((item) => (
                  <Link 
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-stone-50 transition-colors"
                  >
                    <item.icon className="w-5 h-5 text-text-secondary" strokeWidth={1.5} />
                    <span className="text-xs text-text-secondary">{item.label}</span>
                  </Link>
                ))}
                <Link
                  to="/certificates"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  <FileCheck className="w-5 h-5 text-text-secondary" strokeWidth={1.5} />
                  <span className="text-xs text-text-secondary">{t('header.certificates')}</span>
                </Link>
              </div>

              {/* Divider */}
              <div className="border-t border-border-default my-3" />

              {/* Locale Selector */}
              <div className="mb-4">
                <LocaleSelector />
              </div>

              {/* Auth Section */}
              {user ? (
                <div className="space-y-2">
                  <Link
                    to={getDashboardUrl(user.role)}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-stone-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-ds-accent/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-ds-accent" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">{user.name}</p>
                      <p className="text-xs text-text-muted">{t('header.viewDashboard', 'Ver panel')}</p>
                    </div>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="w-full rounded-full"
                    data-testid="mobile-logout-button"
                  >
                    {t('header.logout')}
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full rounded-full" data-testid="mobile-login-button">
                      {t('header.login')}
                    </Button>
                  </Link>
                  <Link to="/register" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full rounded-full bg-ds-primary text-white" data-testid="mobile-register-button">
                      {t('header.signup')}
                    </Button>
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
