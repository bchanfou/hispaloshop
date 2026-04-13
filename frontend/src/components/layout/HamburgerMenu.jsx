import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, Bookmark, Activity, Package, HelpCircle, FileText, Globe as GlobeIcon,
  LayoutDashboard, Settings, LogOut, ChevronDown, Check, User, Store, Users,
  ChefHat, MessageCircle, Info, Megaphone, Truck, Globe2, ShieldCheck,
  Bell, ShoppingBag, Tag, DollarSign, TrendingUp, BarChart3, MessageSquare,
  Shield, Crown, Lock, BarChart
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { getDefaultRoute } from '../../lib/navigation';
import Logo from '../brand/Logo';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';
import i18n from "../../locales/i18n";

// Helper para generar URLs con prefijo de idioma para landings
const LANDING_LANGS = ['es', 'en', 'ko'];
function useLocalizedLandingPath() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'es';
  
  return (path) => {
    const isLanding = ['/productor', '/distribuidor', '/influencer', '/consumidor', '/about', '/landing'].some(
      landing => path === landing || path.startsWith(landing + '/')
    );
    if (isLanding && lang !== 'es' && LANDING_LANGS.includes(lang)) {
      return `/${lang}${path}`;
    }
    return path;
  };
}

/* ── Component ── */
export default function HamburgerMenu({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, initialized } = useAuth();
  const locale = useLocale();
  const [openAccordion, setOpenAccordion] = useState(null);
  const [localeSearch, setLocaleSearch] = useState('');
  const [wishlistCount, setWishlistCount] = useState(0);
  const { t } = useTranslation();
  const getLandingPath = useLocalizedLandingPath();

  // Derive lists from backend data (LocaleContext)
  const COUNTRIES = Object.entries(locale.countries || {}).map(([code, data]) => ({
    code, name: data.name, flag: data.flag || ''
  }));
  const LANGUAGES = Object.entries(locale.languages || {}).map(([code, data]) => ({
    code, name: data.native || data.name || code
  }));
  const CURRENCIES = Object.entries(locale.currencies || {}).map(([code, data]) => ({
    code, name: data.name || code, symbol: data.symbol || code
  }));

  // Fetch wishlist count when menu opens
  useEffect(() => {
    if (!isOpen || !user) return;
    apiClient.get('/wishlist').then(data => setWishlistCount(Array.isArray(data) ? data.length : 0)).catch(() => {});
  }, [isOpen, user]);

  // Close on route change
  useEffect(() => {
    onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = e => { if (e.key === 'Escape') onClose(); };
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
    logout(); // Does window.location.href = '/login'
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

  // Determine user roles
  const isProducer = user?.role === 'producer' || user?.role === 'importer';
  const isImporter = user?.role === 'importer';
  const isInfluencer = user?.role === 'influencer';
  const isSeller = isProducer || isInfluencer;
  const isAdmin = user?.role === 'admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const isStaff = isAdmin || isSuperAdmin;

  return createPortal(
    <AnimatePresence>
      {isOpen && <>
        {/* Overlay */}
        <motion.div
          key="menu-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[9998] bg-stone-950/50 backdrop-blur-sm"
        />

        {/* Drawer — enters from RIGHT */}
        <motion.aside
          key="menu-drawer"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
          className="fixed top-0 right-0 bottom-0 w-[min(340px,85vw)] z-[9999] bg-white flex flex-col overflow-y-auto scrollbar-none shadow-[-8px_0_24px_rgba(0,0,0,0.15)]"
        >
          {/* ── HEADER ── */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <Logo variant="icon" theme="light" size={24} />
              <span className="text-[15px] font-bold text-stone-950">hispaloshop</span>
            </div>
            <button
              onClick={onClose}
              aria-label={i18n.t('hamburger_menu.cerrarMenu', 'Cerrar menú')}
              className="flex items-center justify-center w-8 h-8 rounded-full border-none bg-stone-100 cursor-pointer"
            >
              <X size={18} className="text-stone-950" strokeWidth={2} />
            </button>
          </div>

          {/* ── SECTIONS ── */}
          <div className="flex-1 py-2">

            {/* ── MI CUENTA ── */}
            <SectionLabel>{t('hamburger.miCuenta', 'MI CUENTA')}</SectionLabel>

            {!initialized ? <div className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-stone-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 animate-pulse rounded-full bg-stone-100" />
                    <div className="h-2.5 w-16 animate-pulse rounded-full bg-stone-100" />
                  </div>
                </div>
              </div> : user ? <>
              {/* User info row */}
              <Link
                to={profileUsername ? `/${profileUsername}` : profileUserId ? `/profile/${profileUserId}` : '/profile'}
                onClick={onClose}
                className="flex items-center gap-3 px-5 py-3 no-underline transition-colors hover:bg-stone-50 active:scale-[0.98]"
              >
                {profileImage ? (
                  <img src={profileImage} alt="" className="w-10 h-10 rounded-full object-cover border border-stone-200" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-stone-950 text-white flex items-center justify-center text-base font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-950 m-0 overflow-hidden text-ellipsis whitespace-nowrap">
                    {displayName}
                  </p>
                  {username && <p className="text-xs text-stone-500 mt-px mb-0">@{username}</p>}
                </div>
                {user.plan && user.plan !== 'free' && (
                  <span className={`text-[9px] font-bold text-white rounded-full py-0.5 px-2 uppercase ${user.plan === 'elite' ? 'bg-stone-950' : 'bg-stone-500'}`}>
                    {user.plan}
                  </span>
                )}
                <ChevronDown size={16} className="text-stone-400 -rotate-90" />
              </Link>

              <MenuItem to="/orders" icon={<ShoppingBag size={20} />} label={t('hamburger.pedidos', 'Pedidos')} onClose={onClose} />
              <MenuItem to="/saved" icon={<Bookmark size={20} />} label={t('hamburger.guardados', 'Guardados y listas')} onClose={onClose}>
                {wishlistCount > 0 && (
                  <span className="rounded-full bg-stone-950 text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center px-1 font-semibold ml-auto">
                    {wishlistCount}
                  </span>
                )}
              </MenuItem>
              <MenuItem to="/activity" icon={<Activity size={20} />} label={t('hamburger.actividad', 'Tu actividad')} onClose={onClose} />
              <MenuItem to="/messages" icon={<MessageCircle size={20} />} label={t('hamburger.mensajes', 'Mensajes')} onClose={onClose} />
              <MenuItem to="/notifications" icon={<Bell size={20} />} label={t('hamburger.notificaciones', 'Notificaciones')} onClose={onClose} />
            </> : (
              <div className="px-5 py-2 flex flex-col gap-2">
                <Link to="/login" onClick={onClose} className="block text-center py-3 rounded-full border border-stone-200 text-sm font-semibold text-stone-950 no-underline">
                  {t('auth.entrar', 'Entrar')}
                </Link>
                <Link to="/register" onClick={onClose} className="block text-center py-3 rounded-full bg-stone-950 text-white text-sm font-semibold no-underline">
                  {t('auth.crearCuenta', 'Crear cuenta')}
                </Link>
              </div>
            )}

            <Divider />

            {/* ── EXPLORAR ── */}
            <SectionLabel>{t('hamburger.explorar', 'EXPLORAR')}</SectionLabel>
            <MenuItem to="/discover" icon={<LayoutDashboard size={20} />} label={t('hamburger.descubrir', 'Descubrir')} onClose={onClose} />
            <MenuItem to="/products" icon={<Package size={20} />} label={t('hamburger.productos', 'Productos')} onClose={onClose} />
            <MenuItem to="/stores" icon={<Store size={20} />} label={t('hamburger.tiendas', 'Tiendas')} onClose={onClose} />
            <MenuItem to="/communities" icon={<Users size={20} />} label={t('hamburger.comunidades', 'Comunidades')} onClose={onClose} />
            <MenuItem to="/recipes" icon={<ChefHat size={20} />} label={t('hamburger.recetas', 'Recetas')} onClose={onClose} />

            <Divider />

            {/* ── PARA VENDEDORES (contextual) ── */}
            {isProducer && <>
              <SectionLabel>{t('hamburger.paraVendedores', 'PARA VENDEDORES')}</SectionLabel>
              <MenuItem to="/producer" icon={<LayoutDashboard size={20} />} label={t('hamburger.dashboard', 'Dashboard')} onClose={onClose} />
              <MenuItem to="/producer/products" icon={<Package size={20} />} label={t('hamburger.productos', 'Productos')} onClose={onClose} />
              <MenuItem to="/producer/orders" icon={<ShoppingBag size={20} />} label={t('hamburger.ventas', 'Ventas')} onClose={onClose} />
              {isImporter && (
                <MenuItem to="/importer" icon={<Globe2 size={20} />} label={t('hamburger.importerDashboard', 'Importador')} onClose={onClose} />
              )}
              <Divider />
            </>}

            {/* ── PARA INFLUENCERS (contextual) ── */}
            {isInfluencer && <>
              <SectionLabel>{t('hamburger.paraInfluencers', 'PARA INFLUENCERS')}</SectionLabel>
              <MenuItem to="/influencer/dashboard" icon={<LayoutDashboard size={20} />} label={t('hamburger.dashboard', 'Dashboard')} onClose={onClose} />
              <MenuItem to="/influencer/codes" icon={<Tag size={20} />} label={t('hamburger.codigos', 'Códigos')} onClose={onClose} />
              <MenuItem to="/influencer/payouts" icon={<DollarSign size={20} />} label={t('hamburger.comisiones', 'Comisiones')} onClose={onClose} />
              <Divider />
            </>}

            {/* ── PANEL DE ADMINISTRACIÓN ── */}
            {isAdmin && <>
              <SectionLabel>{t('hamburger.panelAdmin', 'PANEL DE ADMIN')}</SectionLabel>
              <MenuItem to="/admin" icon={<Shield size={20} />} label={t('hamburger.adminDashboard', 'Dashboard Admin')} onClose={onClose} />
              <MenuItem to="/admin/producers" icon={<Store size={20} />} label={t('hamburger.adminProducers', 'Productores')} onClose={onClose} />
              <MenuItem to="/admin/products" icon={<Package size={20} />} label={t('hamburger.adminProducts', 'Productos')} onClose={onClose} />
              <MenuItem to="/admin/orders" icon={<ShoppingBag size={20} />} label={t('hamburger.adminOrders', 'Pedidos')} onClose={onClose} />
              <MenuItem to="/admin/verification" icon={<ShieldCheck size={20} />} label={t('hamburger.adminVerification', 'Verificaciones')} onClose={onClose} />
              <MenuItem to="/admin/support" icon={<MessageSquare size={20} />} label={t('hamburger.adminSupport', 'Soporte')} onClose={onClose} />
              <Divider />
            </>}

            {/* ── PANEL SUPER ADMIN ── */}
            {isSuperAdmin && <>
              <SectionLabel>{t('hamburger.panelSuperAdmin', 'SUPER ADMIN')}</SectionLabel>
              <MenuItem to="/super-admin" icon={<Crown size={20} />} label={t('hamburger.superDashboard', 'Dashboard Super')} onClose={onClose} />
              <MenuItem to="/super-admin/users" icon={<Users size={20} />} label={t('hamburger.superUsers', 'Usuarios')} onClose={onClose} />
              <MenuItem to="/super-admin/finance" icon={<BarChart size={20} />} label={t('hamburger.superFinance', 'Finanzas')} onClose={onClose} />
              <MenuItem to="/super-admin/markets" icon={<Globe2 size={20} />} label={t('hamburger.superMarkets', 'Mercados')} onClose={onClose} />
              <MenuItem to="/super-admin/admins" icon={<Lock size={20} />} label={t('hamburger.superAdmins', 'Administradores')} onClose={onClose} />
              <Divider />
            </>}

            {/* ── ¿ERES VENDEDOR? (contextual si no lo es) ── */}
            {user && !isSeller && <>
              <SectionLabel>{t('hamburger.eresVendedor', '¿ERES VENDEDOR?')}</SectionLabel>
              <MenuItem to={getLandingPath('/productor')} icon={<Truck size={20} />} label={t('hamburger.soyProductor', 'Soy productor')} onClose={onClose} />
              <MenuItem to={getLandingPath('/distribuidor')} icon={<Globe2 size={20} />} label={t('hamburger.soyImportador', 'Soy importador')} onClose={onClose} />
              <MenuItem to={getLandingPath('/influencer')} icon={<Megaphone size={20} />} label={t('hamburger.soyInfluencer', 'Soy influencer')} onClose={onClose} />
              <Divider />
            </>}

            {/* ── PREFERENCIAS ── */}
            <SectionLabel>{t('hamburger.preferencias', 'PREFERENCIAS')}</SectionLabel>

            {/* País */}
            <AccordionRow
              icon={<GlobeIcon size={20} />}
              label={t('hamburger.pais', 'País')}
              value={`${currentCountry.flag} ${currentCountry.name}`}
              isOpen={openAccordion === 'country'}
              onToggle={() => { setLocaleSearch(''); setOpenAccordion(openAccordion === 'country' ? null : 'country'); }}
            >
              <input
                type="text"
                placeholder={t('hamburger.buscarPais', 'Buscar país...')}
                value={localeSearch}
                onChange={e => setLocaleSearch(e.target.value)}
                className="w-full px-3 py-2 mb-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
              <div className="max-h-60 overflow-y-auto">
                {COUNTRIES.filter(c => !localeSearch || c.name.toLowerCase().includes(localeSearch.toLowerCase()) || c.code.toLowerCase().includes(localeSearch.toLowerCase())).map(c => {
                  const isActive = locale?.country === c.code;
                  return <AccordionOption
                    key={c.code}
                    label={`${c.flag} ${c.name}`}
                    isActive={isActive}
                    onClick={() => { locale?.updateCountry?.(c.code); setOpenAccordion(null); setLocaleSearch(''); }}
                  />;
                })}
              </div>
            </AccordionRow>

            {/* Idioma */}
            <AccordionRow
              icon={<span className="text-lg w-5 text-center">🗣️</span>}
              label={t('hamburger.idioma', 'Idioma')}
              value={currentLang.name}
              isOpen={openAccordion === 'language'}
              onToggle={() => { setLocaleSearch(''); setOpenAccordion(openAccordion === 'language' ? null : 'language'); }}
            >
              <input
                type="text"
                placeholder={t('hamburger.buscarIdioma', 'Buscar idioma...')}
                value={localeSearch}
                onChange={e => setLocaleSearch(e.target.value)}
                className="w-full px-3 py-2 mb-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
              <div className="max-h-60 overflow-y-auto">
                {LANGUAGES.filter(l => !localeSearch || l.name.toLowerCase().includes(localeSearch.toLowerCase()) || l.code.includes(localeSearch.toLowerCase())).map(l => {
                  const isActive = locale?.language === l.code;
                  return <AccordionOption
                    key={l.code}
                    label={`${l.code.toUpperCase()} — ${l.name}`}
                    isActive={isActive}
                    onClick={() => { locale?.updateLanguage?.(l.code); setOpenAccordion(null); setLocaleSearch(''); }}
                  />;
                })}
              </div>
            </AccordionRow>

            {/* B13 (4.5d): Divisa accordion hidden — currency is fixed by country. */}

            <Divider />

            {/* ── AYUDA ── */}
            <SectionLabel>{t('hamburger.ayuda', 'AYUDA')}</SectionLabel>
            <MenuItem to={getLandingPath('/about')} icon={<Info size={20} />} label={t('hamburger.queEs', '¿Qué es HispaloShop?')} onClose={onClose} />
            <MenuItem to="/help" icon={<HelpCircle size={20} />} label={t('hamburger.centroAyuda', 'Centro de ayuda')} onClose={onClose} />
            <MenuItem to="/feedback" icon={<MessageSquare size={20} />} label={t('hamburger.feedback', 'Feedback e ideas')} onClose={onClose} />
            <MenuItem to="/terms" icon={<FileText size={20} />} label={t('hamburger.terminos', 'Términos')} onClose={onClose} />
            <MenuItem to="/privacy" icon={<ShieldCheck size={20} />} label={t('hamburger.privacidad', 'Privacidad')} onClose={onClose} />

            {user && <>
              <Divider />
              {/* ── FOOTER ── */}
              <MenuItem to="/settings" icon={<Settings size={20} />} label={t('hamburger.configuracion', 'Configuración')} onClose={onClose} />
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-5 py-3.5 border-none bg-transparent text-[15px] font-medium text-stone-500 cursor-pointer text-left hover:text-stone-950 transition-colors"
              >
                <LogOut size={20} />
                {t('auth.cerrarSesion', 'Cerrar sesión')}
              </button>
            </>}
          </div>
        </motion.aside>
      </>}
    </AnimatePresence>,
    document.body
  );
}

/* ── Helpers ── */
function SectionLabel({ children }) {
  return <p className="px-5 pt-3 pb-1 text-[11px] font-semibold text-stone-500 uppercase tracking-wide m-0">{children}</p>;
}

function MenuItem({ to, icon, label, onClose, children }) {
  return (
    <Link to={to} onClick={onClose} className="flex items-center gap-3 px-5 py-3.5 no-underline text-[15px] font-medium text-stone-950 transition-colors hover:bg-stone-100 active:bg-stone-200">
      {icon && <span className="text-stone-500">{icon}</span>}
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
        className="flex items-center gap-3 w-full px-5 py-3.5 border-none bg-transparent cursor-pointer text-left"
      >
        <span className="text-stone-500 flex shrink-0">{icon}</span>
        <span className="flex-1 text-[15px] font-medium text-stone-950">{label}</span>
        <span className="text-[13px] text-stone-500 mr-1">{value}</span>
        <ChevronDown size={16} className={`text-stone-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="bg-stone-100 rounded-xl mx-3 mb-2 py-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccordionOption({ label, isActive, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex items-center gap-2 w-full px-4 py-2.5 border-none bg-transparent text-left text-sm ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer opacity-100'} ${isActive ? 'text-stone-950 font-semibold' : 'text-stone-500 font-normal'}`}
    >
      <span className="flex-1">{label}</span>
      {isActive && <Check size={16} className="text-stone-950" strokeWidth={2.5} />}
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-stone-200 my-2" />;
}
