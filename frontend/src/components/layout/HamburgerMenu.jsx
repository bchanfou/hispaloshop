import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, Home, Search, Store, ShoppingBag, Users,
  HelpCircle, Sprout, Star, Globe as GlobeIcon, DollarSign,
  LayoutDashboard, Settings, LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { getDefaultRoute } from '../../lib/navigation';
import Logo from '../brand/Logo';

const COUNTRIES = [
  { code: 'ES', flag: '\u{1F1EA}\u{1F1F8}', name: 'Espa\u00f1a' },
  { code: 'FR', flag: '\u{1F1EB}\u{1F1F7}', name: 'Francia' },
  { code: 'KR', flag: '\u{1F1F0}\u{1F1F7}', name: 'Corea' },
  { code: 'US', flag: '\u{1F1FA}\u{1F1F8}', name: 'EE.UU.' },
  { code: 'GB', flag: '\u{1F1EC}\u{1F1E7}', name: 'UK' },
];

const CURRENCIES = ['EUR', 'USD', 'KRW', 'GBP', 'JPY'];

const LANGUAGES = [
  { code: 'es', label: 'Espa\u00f1ol' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Fran\u00e7ais' },
  { code: 'ko', label: '\ud55c\uad6d\uc5b4' },
];

export default function HamburgerMenu({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const locale = useLocale();

  // Close on route change
  useEffect(() => { onClose(); }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/');
  };

  const dashboardUrl = user ? getDefaultRoute(user, user.onboarding_completed) : '/login';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="menu-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 'var(--z-modal)',
              background: 'rgba(0,0,0,0.4)',
            }}
          />

          {/* Drawer */}
          <motion.aside
            key="menu-drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0,
              width: 300, zIndex: 'calc(var(--z-modal) + 1)',
              background: 'var(--color-white)',
              display: 'flex', flexDirection: 'column',
              overflowY: 'auto',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-divider)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Logo variant="icon" theme="light" size={24} />
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-black)' }}>
                  Hispaloshop
                </span>
              </div>
              <button onClick={onClose} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: '50%',
                border: 'none', background: 'var(--color-surface)',
                cursor: 'pointer',
              }}>
                <X size={18} color="var(--color-black)" strokeWidth={2} />
              </button>
            </div>

            {/* Sections */}
            <div style={{ flex: 1, padding: '8px 0' }}>

              {/* NAVEGAR */}
              <SectionLabel>Navegar</SectionLabel>
              <MenuItem to="/" icon={<Home size={20} />} label="Inicio" onClose={onClose} />
              <MenuItem to="/discover" icon={<Search size={20} />} label="Explorar" onClose={onClose} />
              <MenuItem to="/stores" icon={<Store size={20} />} label="Tiendas" onClose={onClose} />
              <MenuItem to="/discover?tab=products" icon={<ShoppingBag size={20} />} label="Productos" onClose={onClose} />
              <MenuItem to="/communities" icon={<Users size={20} />} label="Comunidades" onClose={onClose} />

              <Divider />

              {/* HISPALOSHOP */}
              <SectionLabel>Hispaloshop</SectionLabel>
              <MenuItem to="/about" icon={<HelpCircle size={20} />} label="\u00bfQu\u00e9 es Hispaloshop?" onClose={onClose} />
              <MenuItem to="/productor" icon={<Sprout size={20} />} label="Soy Productor" onClose={onClose} />
              <MenuItem to="/influencer" icon={<Star size={20} />} label="Soy Influencer" onClose={onClose} />
              <MenuItem to="/importador" icon={<GlobeIcon size={20} />} label="Soy Importador" onClose={onClose} />
              <MenuItem to="/precios" icon={<DollarSign size={20} />} label="Precios" onClose={onClose} />

              <Divider />

              {/* CONFIGURACI\u00d3N */}
              <SectionLabel>Configuraci\u00f3n</SectionLabel>

              {/* Pa\u00eds */}
              <div style={{ padding: '8px 20px' }}>
                <span style={{ fontSize: 12, color: 'var(--color-stone)', fontWeight: 500 }}>Pa\u00eds</span>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {COUNTRIES.map(c => (
                    <button
                      key={c.code}
                      onClick={() => locale?.updateCountry?.(c.code)}
                      style={{
                        padding: '4px 10px', borderRadius: 'var(--radius-full)',
                        border: locale?.country === c.code ? '1.5px solid var(--color-black)' : '1px solid var(--color-border)',
                        background: locale?.country === c.code ? 'var(--color-black)' : 'var(--color-white)',
                        color: locale?.country === c.code ? 'var(--color-white)' : 'var(--color-black)',
                        fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      {c.flag} {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Moneda */}
              <div style={{ padding: '8px 20px' }}>
                <span style={{ fontSize: 12, color: 'var(--color-stone)', fontWeight: 500 }}>Moneda</span>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {CURRENCIES.map(cur => (
                    <button
                      key={cur}
                      onClick={() => locale?.updateCurrency?.(cur)}
                      style={{
                        padding: '4px 10px', borderRadius: 'var(--radius-full)',
                        border: locale?.currency === cur ? '1.5px solid var(--color-black)' : '1px solid var(--color-border)',
                        background: locale?.currency === cur ? 'var(--color-black)' : 'var(--color-white)',
                        color: locale?.currency === cur ? 'var(--color-white)' : 'var(--color-black)',
                        fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              </div>

              {/* Idioma */}
              <div style={{ padding: '8px 20px' }}>
                <span style={{ fontSize: 12, color: 'var(--color-stone)', fontWeight: 500 }}>Idioma</span>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => locale?.updateLanguage?.(lang.code)}
                      style={{
                        padding: '4px 10px', borderRadius: 'var(--radius-full)',
                        border: locale?.language === lang.code ? '1.5px solid var(--color-black)' : '1px solid var(--color-border)',
                        background: locale?.language === lang.code ? 'var(--color-black)' : 'var(--color-white)',
                        color: locale?.language === lang.code ? 'var(--color-white)' : 'var(--color-black)',
                        fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              <Divider />

              {/* CUENTA */}
              <SectionLabel>Cuenta</SectionLabel>
              {user ? (
                <>
                  <MenuItem to={dashboardUrl} icon={<LayoutDashboard size={20} />} label="Mi dashboard" onClose={onClose} />
                  <MenuItem to="/settings" icon={<Settings size={20} />} label="Configuraci\u00f3n" onClose={onClose} />
                  <Divider />
                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '14px 20px',
                      border: 'none', background: 'transparent',
                      fontSize: 15, fontWeight: 500, color: 'var(--color-red)',
                      cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      textAlign: 'left',
                    }}
                  >
                    <LogOut size={20} />
                    Cerrar sesi\u00f3n
                  </button>
                </>
              ) : (
                <>
                  <MenuItem to="/login" icon={null} label="Entrar" onClose={onClose} />
                  <MenuItem to="/register" icon={null} label="Crear cuenta" onClose={onClose} />
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Helpers ── */

function SectionLabel({ children }) {
  return (
    <p style={{
      padding: '12px 20px 4px',
      fontSize: 11, fontWeight: 600,
      color: 'var(--color-stone)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      margin: 0,
    }}>
      {children}
    </p>
  );
}

function MenuItem({ to, icon, label, onClose }) {
  return (
    <Link
      to={to}
      onClick={onClose}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 20px',
        textDecoration: 'none',
        fontSize: 15, fontWeight: 500,
        color: 'var(--color-black)',
        fontFamily: 'var(--font-sans)',
        transition: 'background 0.1s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {icon && <span style={{ color: 'var(--color-stone)' }}>{icon}</span>}
      {label}
    </Link>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--color-divider)', margin: '4px 20px' }} />;
}
