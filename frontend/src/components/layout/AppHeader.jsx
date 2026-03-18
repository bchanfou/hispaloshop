import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ShoppingCart, Search, ChevronDown, LogOut, LayoutDashboard, Settings, Menu, User } from 'lucide-react';
import HamburgerMenu from './HamburgerMenu';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useUnreadNotifications } from '../../hooks/api/useNotifications';
import { getDefaultRoute } from '../../lib/navigation';
import Logo from '../brand/Logo';

const NAV_LINKS = [
  { label: 'Inicio',       to: '/' },
  { label: 'Explorar',     to: '/discover' },
  { label: 'Tiendas',      to: '/stores' },
  { label: 'Comunidades',  to: '/communities' },
];

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { getTotalItems } = useCart();
  const { data: unreadData } = useUnreadNotifications();

  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = user ? (unreadData?.count ?? 0) : 0;
  const totalCartItems = getTotalItems();
  const dashboardUrl = user ? getDefaultRoute(user, user.onboarding_completed) : '/login';

  const profileImage = user?.profile_image || user?.avatar_url || null;
  const firstName = useMemo(() => {
    const raw = user?.name || user?.full_name || user?.username || '';
    return raw.trim().split(' ')[0] || 'Perfil';
  }, [user]);

  const initials = useMemo(() => {
    const name = user?.name || user?.full_name || user?.username || '?';
    return name.trim().charAt(0).toUpperCase();
  }, [user]);

  // Scroll-aware border + shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown on outside click / Escape
  useEffect(() => {
    if (!dropdownOpen) return;
    const onClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    const onEscape = (e) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [dropdownOpen]);

  // Close dropdown on route change
  useEffect(() => { setDropdownOpen(false); }, [location.pathname]);

  const isActive = useCallback((path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  const runSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/products?search=${encodeURIComponent(q)}`);
    setSearchQuery('');
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-sticky)',
        background: 'var(--color-cream)',
        borderBottom: scrolled ? '1px solid var(--color-border)' : '1px solid transparent',
        boxShadow: scrolled ? 'var(--shadow-xs)' : 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Hamburger Menu drawer */}
      <HamburgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* ── Mobile Header ── */}
      <div className="lg:hidden" style={{
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-4)',
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Logo variant="icon" theme="light" size={28} />
          <span style={{
            fontSize: 'var(--text-md)',
            fontWeight: 700,
            color: 'var(--color-black)',
            letterSpacing: '-0.01em',
          }}>
            Hispaloshop
          </span>
        </Link>

        {/* Right icons: notif + cart + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Notification bell */}
          <Link to="/notifications" style={{ position: 'relative', ...iconButtonStyle }}>
            <Bell size={20} color="var(--color-black)" strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span style={redBadgeStyle}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Cart */}
          <Link to="/cart" style={{ position: 'relative', ...iconButtonStyle }}>
            <ShoppingCart size={20} color="var(--color-black)" strokeWidth={1.8} />
            {totalCartItems > 0 && (
              <span style={blackBadgeStyle}>
                {totalCartItems > 9 ? '9+' : totalCartItems}
              </span>
            )}
          </Link>

          {/* Hamburger — last icon on the right */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 38, height: 38, borderRadius: '50%',
              border: 'none', background: 'transparent', cursor: 'pointer',
            }}
          >
            <Menu size={22} color="var(--color-black)" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* ── Desktop Header ── */}
      <div className="hidden lg:grid" style={{
        height: 60,
        gridTemplateColumns: '200px 1fr 200px',
        alignItems: 'center',
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        padding: '0 var(--space-4)',
      }}>
        {/* Left: Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Logo variant="icon" theme="light" size={30} />
          <span style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 700,
            color: 'var(--color-black)',
            letterSpacing: '-0.01em',
          }}>
            Hispaloshop
          </span>
        </Link>

        {/* Center: Nav links */}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          {NAV_LINKS.map(link => {
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  position: 'relative',
                  padding: '8px 16px',
                  fontSize: 'var(--text-sm)',
                  fontWeight: active ? 600 : 500,
                  color: active ? 'var(--color-black)' : 'var(--color-stone)',
                  textDecoration: 'none',
                  borderRadius: 'var(--radius-full)',
                  transition: 'color 0.15s ease, background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'var(--color-surface)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {link.label}
                {/* Active green dot */}
                {active && (
                  <span style={{
                    position: 'absolute',
                    bottom: 2,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: 'var(--color-black)',
                  }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Search + Icons + Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
          {/* Search (compact) */}
          <form onSubmit={runSearch} style={{ position: 'relative' }}>
            <Search size={14} color="var(--color-stone)"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar…"
              style={{
                width: 140,
                height: 34,
                paddingLeft: 30,
                paddingRight: 10,
                fontSize: 'var(--text-xs)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-full)',
                outline: 'none',
                color: 'var(--color-black)',
                fontFamily: 'var(--font-sans)',
                transition: 'border-color 0.15s ease, width 0.2s ease',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--color-black)';
                e.currentTarget.style.width = '180px';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.width = '140px';
              }}
            />
          </form>

          {/* Notification bell */}
          <Link to="/notifications" style={{ position: 'relative', ...iconButtonStyle }}>
            <Bell size={19} color="var(--color-black)" strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span style={redBadgeStyle}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Cart */}
          <Link to="/cart" style={{ position: 'relative', ...iconButtonStyle }}>
            <ShoppingCart size={19} color="var(--color-black)" strokeWidth={1.8} />
            {totalCartItems > 0 && (
              <span style={blackBadgeStyle}>
                {totalCartItems > 9 ? '9+' : totalCartItems}
              </span>
            )}
          </Link>

          {/* Avatar dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px 4px 4px',
                border: `1px solid ${dropdownOpen ? 'var(--color-black)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-full)',
                background: dropdownOpen ? 'var(--color-surface)' : 'var(--color-white)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt=""
                  style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--color-black)', color: 'var(--color-white)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {initials}
                </div>
              )}
              <ChevronDown size={14} color="var(--color-stone)"
                style={{
                  transition: 'transform 0.15s ease',
                  transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
                }}
              />
            </button>

            {/* Dropdown panel */}
            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: 220,
                background: 'var(--color-white)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden',
                zIndex: 50,
              }}>
                {/* User info */}
                <div style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--color-divider)',
                }}>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-black)', margin: 0 }}>
                    {firstName}
                  </p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-stone)', margin: '2px 0 0' }}>
                    {user?.email || ''}
                  </p>
                </div>

                {/* Links */}
                <div style={{ padding: '6px' }}>
                  <DropdownLink to={user?.username ? `/${user.username.toLowerCase()}` : '/profile'} icon={<User size={16} />} label="Mi perfil" onClick={() => setDropdownOpen(false)} />
                  <DropdownLink to={dashboardUrl} icon={<LayoutDashboard size={16} />} label="Mi panel" onClick={() => setDropdownOpen(false)} />
                  <DropdownLink to="/settings/locale" icon={<Settings size={16} />} label="Configuración" onClick={() => setDropdownOpen(false)} />
                </div>

                {/* Logout */}
                <div style={{ padding: '6px', borderTop: '1px solid var(--color-divider)' }}>
                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '10px 12px',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-red)',
                      fontFamily: 'var(--font-sans)',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-red-light)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogOut size={16} />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ── Dropdown link helper ── */
function DropdownLink({ to, icon, label, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        textDecoration: 'none',
        fontSize: 'var(--text-sm)',
        color: 'var(--color-black)',
        fontFamily: 'var(--font-sans)',
        transition: 'background 0.1s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ color: 'var(--color-stone)' }}>{icon}</span>
      {label}
    </Link>
  );
}

/* ── Shared styles ── */
const iconButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 38,
  height: 38,
  borderRadius: '50%',
  textDecoration: 'none',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  transition: 'background 0.1s ease',
};

const redBadgeStyle = {
  position: 'absolute',
  top: 2,
  right: 2,
  minWidth: 16,
  height: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 'var(--radius-full)',
  background: 'var(--color-red)',
  color: 'var(--color-white)',
  fontSize: 9,
  fontWeight: 800,
  padding: '0 4px',
  lineHeight: 1,
  fontFamily: 'var(--font-sans)',
};

const blackBadgeStyle = {
  position: 'absolute',
  top: 2,
  right: 2,
  minWidth: 16,
  height: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 'var(--radius-full)',
  background: 'var(--color-black)',
  color: 'var(--color-white)',
  fontSize: 9,
  fontWeight: 800,
  padding: '0 4px',
  lineHeight: 1,
  fontFamily: 'var(--font-sans)',
};
