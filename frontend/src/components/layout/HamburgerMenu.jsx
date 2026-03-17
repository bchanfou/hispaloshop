import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, Home, Search, Store, ShoppingBag, Users, Award,
  HelpCircle, Sprout, Star, Globe as GlobeIcon,
  LayoutDashboard, Settings, LogOut, ChevronDown, Check,
  ClipboardList, UtensilsCrossed, Package,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { getDefaultRoute } from '../../lib/navigation';
import Logo from '../brand/Logo';

/* ── Data ── */

const COUNTRIES = [
  { code: 'ES', flag: '🇪🇸', name: 'España', status: 'active' },
  { code: 'FR', flag: '🇫🇷', name: 'Francia', status: 'active' },
  { code: 'KR', flag: '🇰🇷', name: 'Corea', status: 'beta' },
  { code: 'IT', flag: '🇮🇹', name: 'Italia', status: 'soon' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal', status: 'soon' },
  { code: 'DE', flag: '🇩🇪', name: 'Alemania', status: 'soon' },
];

const LANGUAGES = [
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'ko', flag: '🇰🇷', name: '한국어' },
];

const CURRENCIES = [
  { code: 'EUR', name: 'Euro' },
  { code: 'USD', name: 'Dólar' },
  { code: 'KRW', name: 'Won coreano' },
  { code: 'JPY', name: 'Yen japonés' },
  { code: 'GBP', name: 'Libra esterlina' },
];

/* ── Component ── */

export default function HamburgerMenu({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const locale = useLocale();
  const [openAccordion, setOpenAccordion] = useState(null);

  // Close on route change
  useEffect(() => { onClose(); }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Reset accordion when menu closes
  useEffect(() => {
    if (!isOpen) setOpenAccordion(null);
  }, [isOpen]);

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/');
  };

  const dashboardUrl = user ? getDefaultRoute(user, user.onboarding_completed) : '/login';
  const isB2BUser = user?.role === 'producer' || user?.role === 'importer';

  const profileImage = user?.profile_image || user?.avatar_url || null;
  const displayName = user?.name || user?.full_name || user?.username || '';
  const username = user?.username || '';
  const profileUserId = user?.user_id || user?.id || null;

  const currentCountry = COUNTRIES.find(c => c.code === locale?.country) || COUNTRIES[0];
  const currentLang = LANGUAGES.find(l => l.code === locale?.language) || LANGUAGES[0];
  const currentCurrency = CURRENCIES.find(c => c.code === locale?.currency) || CURRENCIES[0];

  return createPortal(
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
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(10,10,10,0.5)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />

          {/* Drawer — enters from RIGHT */}
          <motion.aside
            key="menu-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
              type: 'tween',
              ease: [0.32, 0.72, 0, 1],
              duration: 0.3,
            }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: 'min(300px, 85vw)',
              zIndex: 9999,
              background: 'var(--color-white)',
              display: 'flex', flexDirection: 'column',
              overflowY: 'auto',
              scrollbarWidth: 'none',
              fontFamily: 'var(--font-sans)',
              boxShadow: 'var(--shadow-xl, -8px 0 24px rgba(0,0,0,0.15))',
            }}
          >
            {/* ── HEADER ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-divider, var(--color-border))',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Logo variant="icon" theme="light" size={24} />
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-black)' }}>
                  hispaloshop
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

            {/* ── SECTIONS ── */}
            <div style={{ flex: 1, padding: '8px 0' }}>

              {/* ── NAVEGAR ── */}
              <SectionLabel>NAVEGAR</SectionLabel>
              <MenuItem to="/" icon={<Home size={20} />} label="Inicio" onClose={onClose} />
              <MenuItem to="/explore" icon={<Search size={20} />} label="Explorar" onClose={onClose} />
              <MenuItem to="/stores" icon={<Store size={20} />} label="Tiendas" onClose={onClose} />
              <MenuItem to="/explore?tab=products" icon={<ShoppingBag size={20} />} label="Productos" onClose={onClose} />
              <MenuItem to="/recipes" icon={<UtensilsCrossed size={20} />} label="Recetas" onClose={onClose} />
              <MenuItem to="/communities" icon={<Users size={20} />} label="Comunidades" onClose={onClose} />
              <MenuItem to="/certificates" icon={<Award size={20} />} label="Certificados digitales" onClose={onClose} />

              <Divider />

              {/* ── HISPALOSHOP ── */}
              <SectionLabel>HISPALOSHOP</SectionLabel>
              <MenuItem to="/about" icon={<HelpCircle size={20} />} label="¿Qué es Hispaloshop?" onClose={onClose} />
              <MenuItem to="/productor" icon={<Sprout size={20} />} label="Soy Productor" onClose={onClose} />
              <MenuItem to="/influencer" icon={<Star size={20} />} label="Soy Influencer" onClose={onClose} />
              <MenuItem to="/importador" icon={<GlobeIcon size={20} />} label="Soy Importador" onClose={onClose} />

              {/* ── MAYORISTA (B2B) — solo producer/importer ── */}
              {isB2BUser && (
                <>
                  <Divider />
                  <SectionLabel>MAYORISTA</SectionLabel>
                  <MenuItem to="/b2b/catalog" icon={<ClipboardList size={20} />} label="Catálogo B2B" onClose={onClose}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: '#fff',
                      background: 'var(--color-blue, #3b82f6)',
                      borderRadius: 'var(--radius-full)',
                      padding: '1px 6px', marginLeft: 6,
                    }}>
                      B2B
                    </span>
                  </MenuItem>
                </>
              )}

              <Divider />

              {/* ── PREFERENCIAS ── */}
              <SectionLabel>PREFERENCIAS</SectionLabel>

              {/* País */}
              <AccordionRow
                icon={<GlobeIcon size={20} />}
                label="País"
                value={`${currentCountry.flag} ${currentCountry.name}`}
                isOpen={openAccordion === 'country'}
                onToggle={() => setOpenAccordion(openAccordion === 'country' ? null : 'country')}
              >
                {COUNTRIES.map((c) => {
                  const isActive = locale?.country === c.code;
                  const disabled = c.status === 'soon';
                  return (
                    <AccordionOption
                      key={c.code}
                      label={`${c.flag} ${c.name}`}
                      isActive={isActive}
                      disabled={disabled}
                      badge={c.status === 'beta' ? 'Beta' : c.status === 'soon' ? 'Próx.' : null}
                      badgeVariant={c.status === 'beta' ? 'blue' : 'gray'}
                      onClick={() => {
                        if (disabled) return;
                        locale?.updateCountry?.(c.code);
                        localStorage.setItem('hsp_country', c.code);
                        setOpenAccordion(null);
                      }}
                    />
                  );
                })}
              </AccordionRow>

              {/* Idioma */}
              <AccordionRow
                icon={<span style={{ fontSize: 18, width: 20, textAlign: 'center' }}>🗣️</span>}
                label="Idioma"
                value={currentLang.name}
                isOpen={openAccordion === 'language'}
                onToggle={() => setOpenAccordion(openAccordion === 'language' ? null : 'language')}
              >
                {LANGUAGES.map((l) => {
                  const isActive = locale?.language === l.code;
                  return (
                    <AccordionOption
                      key={l.code}
                      label={`${l.flag} ${l.name}`}
                      isActive={isActive}
                      onClick={() => {
                        locale?.updateLanguage?.(l.code);
                        localStorage.setItem('hsp_lang', l.code);
                        setOpenAccordion(null);
                      }}
                    />
                  );
                })}
              </AccordionRow>

              {/* Divisa */}
              <AccordionRow
                icon={<span style={{ fontSize: 18, width: 20, textAlign: 'center' }}>💱</span>}
                label="Divisa"
                value={currentCurrency.code}
                isOpen={openAccordion === 'currency'}
                onToggle={() => setOpenAccordion(openAccordion === 'currency' ? null : 'currency')}
              >
                {CURRENCIES.map((c) => {
                  const isActive = locale?.currency === c.code;
                  return (
                    <AccordionOption
                      key={c.code}
                      label={`${c.code} — ${c.name}`}
                      isActive={isActive}
                      onClick={() => {
                        locale?.updateCurrency?.(c.code);
                        localStorage.setItem('hsp_currency', c.code);
                        setOpenAccordion(null);
                      }}
                    />
                  );
                })}
              </AccordionRow>

              <Divider />

              {/* ── CUENTA ── */}
              <SectionLabel>CUENTA</SectionLabel>
              {user ? (
                <>
                  {/* User info row */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 20px',
                  }}>
                    {profileImage ? (
                      <img src={profileImage} alt="" style={{
                        width: 40, height: 40, borderRadius: '50%', objectFit: 'cover',
                        border: '1px solid var(--color-border)',
                      }} />
                    ) : (
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'var(--color-black)', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 700,
                      }}>
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 14, fontWeight: 600, color: 'var(--color-black)',
                        margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {displayName}
                      </p>
                      {username && (
                        <p style={{ fontSize: 12, color: 'var(--color-stone)', margin: '1px 0 0' }}>
                          @{username}
                        </p>
                      )}
                    </div>
                    {user.plan && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, color: '#fff',
                        background: user.plan === 'elite' ? 'var(--color-black)' : user.plan === 'pro' ? 'var(--color-stone)' : 'var(--color-border)',
                        borderRadius: 'var(--radius-full)',
                        padding: '2px 8px',
                        textTransform: 'uppercase',
                      }}>
                        {user.plan}
                      </span>
                    )}
                  </div>

                  <MenuItem to={profileUserId ? `/user/${profileUserId}` : '/profile'} icon={<Settings size={20} />} label="Mi perfil" onClose={onClose} />
                  <MenuItem to="/orders" icon={<Package size={20} />} label="Mis pedidos" onClose={onClose} />
                  <MenuItem to="/settings" icon={<Settings size={20} />} label="Configuración" onClose={onClose} />
                  <MenuItem to={dashboardUrl} icon={<LayoutDashboard size={20} />} label="Mi Dashboard" onClose={onClose} />

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
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <div style={{ padding: '8px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Link
                    to="/login"
                    onClick={onClose}
                    style={{
                      display: 'block', textAlign: 'center',
                      padding: '12px 0', borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--color-border)',
                      fontSize: 14, fontWeight: 600, color: 'var(--color-black)',
                      textDecoration: 'none', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Entrar
                  </Link>
                  <Link
                    to="/register"
                    onClick={onClose}
                    style={{
                      display: 'block', textAlign: 'center',
                      padding: '12px 0', borderRadius: 'var(--radius-full)',
                      background: 'var(--color-black)', color: '#fff',
                      fontSize: 14, fontWeight: 600,
                      textDecoration: 'none', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Crear cuenta
                  </Link>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
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

function MenuItem({ to, icon, label, onClose, children }) {
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
      {children}
    </Link>
  );
}

function AccordionRow({ icon, label, value, isOpen, onToggle, children }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          width: '100%', padding: '14px 20px',
          border: 'none', background: 'transparent',
          cursor: 'pointer', fontFamily: 'var(--font-sans)',
          textAlign: 'left',
        }}
      >
        <span style={{ color: 'var(--color-stone)', display: 'flex', flexShrink: 0 }}>{icon}</span>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--color-black)' }}>
          {label}
        </span>
        <span style={{ fontSize: 13, color: 'var(--color-stone)', marginRight: 4 }}>
          {value}
        </span>
        <ChevronDown
          size={16}
          color="var(--color-stone)"
          style={{
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
            flexShrink: 0,
          }}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              margin: '0 12px 8px 12px',
              padding: '4px 0',
            }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccordionOption({ label, isActive, disabled, badge, badgeVariant, onClick }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '10px 16px',
        border: 'none', background: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        fontFamily: 'var(--font-sans)',
        textAlign: 'left',
        fontSize: 14,
        color: isActive ? 'var(--color-black)' : 'var(--color-stone)',
        fontWeight: isActive ? 600 : 400,
      }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          fontSize: 9, fontWeight: 600,
          padding: '1px 6px',
          borderRadius: 'var(--radius-full)',
          background: badgeVariant === 'blue' ? 'var(--color-blue, #3b82f6)' : 'var(--color-border)',
          color: badgeVariant === 'blue' ? '#fff' : 'var(--color-stone)',
        }}>
          {badge}
        </span>
      )}
      {isActive && <Check size={16} color="var(--color-black)" strokeWidth={2.5} />}
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--color-divider, var(--color-border))', margin: '8px 0' }} />;
}
