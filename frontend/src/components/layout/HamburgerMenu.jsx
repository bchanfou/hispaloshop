import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, Bookmark, Activity, Package,
  HelpCircle, FileText, Globe as GlobeIcon,
  LayoutDashboard, Settings, LogOut, ChevronDown, Check,
  User, Store, Users, ChefHat, MessageCircle, Info, Megaphone, Truck, Globe2,
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

  const profileImage = user?.profile_image || user?.avatar_url || null;
  const displayName = user?.name || user?.full_name || user?.username || '';
  const username = user?.username || '';
  const profileUserId = user?.user_id || user?.id || user?.username || null;
  const profileUsername = user?.username || null;

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
              background: '#ffffff',
              display: 'flex', flexDirection: 'column',
              overflowY: 'auto',
              scrollbarWidth: 'none',
              fontFamily: 'inherit',
              boxShadow: '-8px 0 24px rgba(0,0,0,0.15)',
            }}
          >
            {/* ── HEADER ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid #e7e5e4',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Logo variant="icon" theme="light" size={24} />
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0c0a09' }}>
                  hispaloshop
                </span>
              </div>
              <button onClick={onClose} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: '50%',
                border: 'none', background: '#f5f5f4',
                cursor: 'pointer',
              }}>
                <X size={18} color="#0c0a09" strokeWidth={2} />
              </button>
            </div>

            {/* ── SECTIONS ── */}
            <div style={{ flex: 1, padding: '8px 0' }}>

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
                        border: '1px solid #e7e5e4',
                      }} />
                    ) : (
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: '#0c0a09', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 700,
                      }}>
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 14, fontWeight: 600, color: '#0c0a09',
                        margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {displayName}
                      </p>
                      {username && (
                        <p style={{ fontSize: 12, color: '#78716c', margin: '1px 0 0' }}>
                          @{username}
                        </p>
                      )}
                    </div>
                    {user.plan && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, color: '#fff',
                        background: user.plan === 'elite' ? '#0c0a09' : user.plan === 'pro' ? '#78716c' : '#e7e5e4',
                        borderRadius: '9999px',
                        padding: '2px 8px',
                        textTransform: 'uppercase',
                      }}>
                        {user.plan}
                      </span>
                    )}
                  </div>

                  <MenuItem to={profileUsername ? `/${profileUsername}` : (profileUserId ? `/profile/${profileUserId}` : '/profile')} icon={<User size={20} />} label="Mi perfil" onClose={onClose} />
                  <MenuItem to="/settings" icon={<Settings size={20} />} label="Configuración" onClose={onClose} />
                  <MenuItem to={dashboardUrl} icon={<LayoutDashboard size={20} />} label="Mi Dashboard" onClose={onClose} />
                  <MenuItem to="/messages" icon={<MessageCircle size={20} />} label="Mensajes" onClose={onClose} />
                </>
              ) : (
                <div style={{ padding: '8px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Link
                    to="/login"
                    onClick={onClose}
                    style={{
                      display: 'block', textAlign: 'center',
                      padding: '12px 0', borderRadius: '9999px',
                      border: '1px solid #e7e5e4',
                      fontSize: 14, fontWeight: 600, color: '#0c0a09',
                      textDecoration: 'none', fontFamily: 'inherit',
                    }}
                  >
                    Entrar
                  </Link>
                  <Link
                    to="/register"
                    onClick={onClose}
                    style={{
                      display: 'block', textAlign: 'center',
                      padding: '12px 0', borderRadius: '9999px',
                      background: '#0c0a09', color: '#fff',
                      fontSize: 14, fontWeight: 600,
                      textDecoration: 'none', fontFamily: 'inherit',
                    }}
                  >
                    Crear cuenta
                  </Link>
                </div>
              )}

              <Divider />

              {/* ── EXPLORAR ── */}
              <SectionLabel>EXPLORAR</SectionLabel>
              <MenuItem to="/products" icon={<Package size={20} />} label="Productos" onClose={onClose} />
              <MenuItem to="/stores" icon={<Store size={20} />} label="Tiendas" onClose={onClose} />
              <MenuItem to="/community" icon={<Users size={20} />} label="Comunidades" onClose={onClose} />
              <MenuItem to="/recipes" icon={<ChefHat size={20} />} label="Recetas" onClose={onClose} />

              <Divider />

              {/* ── CONTENIDO ── */}
              <SectionLabel>CONTENIDO</SectionLabel>
              <MenuItem to="/saved" icon={<Bookmark size={20} />} label="Guardados" onClose={onClose} />
              <MenuItem to="/orders" icon={<Package size={20} />} label="Mis pedidos" onClose={onClose} />
              <MenuItem to="/activity" icon={<Activity size={20} />} label="Actividad" onClose={onClose} />

              <Divider />

              {/* ── APLICACIÓN ── */}
              <SectionLabel>APLICACIÓN</SectionLabel>

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
                      badgeVariant={c.status === 'beta' ? 'dark' : 'gray'}
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

              {/* ── PIE ── */}
              <SectionLabel>SOPORTE</SectionLabel>
              <MenuItem to="/about" icon={<HelpCircle size={20} />} label="Ayuda" onClose={onClose} />
              <MenuItem to="/terms" icon={<FileText size={20} />} label="Términos y condiciones" onClose={onClose} />

              <Divider />

              {/* ── HISPALOSHOP ── */}
              <SectionLabel>HISPALOSHOP</SectionLabel>
              <MenuItem to="/que-es" icon={<Info size={20} />} label="¿Qué es HispaloShop?" onClose={onClose} />
              <MenuItem to="/soy-influencer" icon={<Megaphone size={20} />} label="Soy Influencer" onClose={onClose} />
              <MenuItem to="/soy-productor" icon={<Truck size={20} />} label="Soy Productor" onClose={onClose} />
              <MenuItem to="/soy-importador" icon={<Globe2 size={20} />} label="Soy Importador" onClose={onClose} />

              {user && (
                <>
                  <Divider />
                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '14px 20px',
                      border: 'none', background: 'transparent',
                      fontSize: 15, fontWeight: 500, color: '#dc2626',
                      cursor: 'pointer', fontFamily: 'inherit',
                      textAlign: 'left',
                    }}
                  >
                    <LogOut size={20} />
                    Cerrar sesión
                  </button>
                </>
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
      color: '#78716c',
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
        color: '#0c0a09',
        fontFamily: 'inherit',
        transition: 'background 0.1s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#f5f5f4'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {icon && <span style={{ color: '#78716c' }}>{icon}</span>}
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
          cursor: 'pointer', fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <span style={{ color: '#78716c', display: 'flex', flexShrink: 0 }}>{icon}</span>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: '#0c0a09' }}>
          {label}
        </span>
        <span style={{ fontSize: 13, color: '#78716c', marginRight: 4 }}>
          {value}
        </span>
        <ChevronDown
          size={16}
          color="#78716c"
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
              background: '#f5f5f4',
              borderRadius: '12px',
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
        fontFamily: 'inherit',
        textAlign: 'left',
        fontSize: 14,
        color: isActive ? '#0c0a09' : '#78716c',
        fontWeight: isActive ? 600 : 400,
      }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          fontSize: 9, fontWeight: 600,
          padding: '1px 6px',
          borderRadius: '9999px',
          background: badgeVariant === 'dark' ? '#0c0a09' : '#e7e5e4',
          color: badgeVariant === 'dark' ? '#fff' : '#78716c',
        }}>
          {badge}
        </span>
      )}
      {isActive && <Check size={16} color="#0c0a09" strokeWidth={2.5} />}
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: '#e7e5e4', margin: '8px 0' }} />;
}
