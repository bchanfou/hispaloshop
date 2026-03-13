import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Share2,
  ShoppingCart,
  Store,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { resolveUserImage } from '../../features/user/queries';

// ── Links de navegación por rol ──────────────────────────────────────────────
// iconBg / iconColor definen el color del icono según su función semántica
const ROLE_LINKS = {
  producer: [
    { label: 'Mi Dashboard',   icon: LayoutDashboard, to: '/producer/overview',      iconBg: 'bg-stone-950',   iconColor: 'text-white' },
    { label: 'Mis Productos',  icon: Package,         to: '/producer/products',      iconBg: 'bg-orange-100',  iconColor: 'text-orange-600' },
    { label: 'Pedidos',        icon: ShoppingCart,    to: '/producer/orders',        iconBg: 'bg-blue-100',    iconColor: 'text-blue-600' },
    { label: 'Análisis',       icon: BarChart3,       to: '/producer/insights',      iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { label: 'Pagos',          icon: CreditCard,      to: '/producer/payments',      iconBg: 'bg-amber-100',   iconColor: 'text-amber-600' },
    { label: 'Mi Tienda',      icon: Store,           to: '/producer/store-profile', iconBg: 'bg-violet-100',  iconColor: 'text-violet-600' },
  ],
  importer: [
    { label: 'Mi Dashboard',   icon: LayoutDashboard, to: '/importer/dashboard', iconBg: 'bg-stone-950',   iconColor: 'text-white' },
    { label: 'Catálogo',       icon: Package,         to: '/importer/catalog',   iconBg: 'bg-orange-100',  iconColor: 'text-orange-600' },
    { label: 'Presupuestos',   icon: ShoppingCart,    to: '/importer/quotes',    iconBg: 'bg-blue-100',    iconColor: 'text-blue-600' },
    { label: 'Análisis',       icon: BarChart3,       to: '/importer/dashboard', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  ],
  influencer: [
    { label: 'Mi Dashboard',   icon: LayoutDashboard, to: '/influencer/dashboard', iconBg: 'bg-stone-950',   iconColor: 'text-white' },
    { label: 'Estadísticas',   icon: TrendingUp,      to: '/influencer/insights',  iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { label: 'Comisiones',     icon: CreditCard,      to: '/influencer/dashboard', iconBg: 'bg-amber-100',   iconColor: 'text-amber-600' },
  ],
  customer: [
    { label: 'Mis Pedidos',    icon: ShoppingCart, to: '/customer/orders',   iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { label: 'Lista de Deseos',icon: Heart,        to: '/customer/wishlist', iconBg: 'bg-rose-100', iconColor: 'text-rose-500' },
  ],
  consumer: [
    { label: 'Mis Pedidos',    icon: ShoppingCart, to: '/customer/orders',   iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { label: 'Lista de Deseos',icon: Heart,        to: '/customer/wishlist', iconBg: 'bg-rose-100', iconColor: 'text-rose-500' },
  ],
};

const ROLE_LABEL = {
  producer:  'Productor',
  importer:  'Importador',
  influencer:'Influencer',
  customer:  'Comprador',
  consumer:  'Comprador',
  admin:     'Admin',
};

// Colores del badge de rol en el user card
const ROLE_BADGE = {
  producer:   { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  importer:   { bg: 'bg-blue-100',    text: 'text-blue-700' },
  influencer: { bg: 'bg-violet-100',  text: 'text-violet-700' },
  customer:   { bg: 'bg-stone-100',   text: 'text-stone-600' },
  consumer:   { bg: 'bg-stone-100',   text: 'text-stone-600' },
};

// Ruta principal del dashboard por rol (para el botón CTA)
const ROLE_DASHBOARD_ROUTE = {
  producer:   '/producer/overview',
  importer:   '/importer/dashboard',
  influencer: '/influencer/dashboard',
  customer:   '/customer/orders',
  consumer:   '/customer/orders',
};

const IS_PROFESSIONAL = ['producer', 'importer', 'influencer'];

// ── HamburgerPanel ────────────────────────────────────────────────────────────
function HamburgerPanel({ isOpen, onClose, onShare }) {
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();

  const role        = currentUser?.role || 'customer';
  const roleLinks   = ROLE_LINKS[role]  || ROLE_LINKS.customer;
  const roleLabel   = ROLE_LABEL[role]  || '';
  const roleBadge   = ROLE_BADGE[role]  || ROLE_BADGE.customer;
  const isPro       = IS_PROFESSIONAL.includes(role);
  const sectionLabel= isPro ? 'Panel profesional' : 'Mi cuenta';
  const dashRoute   = ROLE_DASHBOARD_ROUTE[role] || '/';

  const displayName   = currentUser?.name     || currentUser?.username || 'Usuario';
  const handle        = currentUser?.username  || null;
  const profileImage  = currentUser?.profile_image || currentUser?.avatar_url || null;

  // Cerrar con Escape
  useEffect(() => {
    const onEscape = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [isOpen, onClose]);

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleNavLink = (to) => { navigate(to); onClose(); };
  const handleLogout  = () => { logout(); onClose(); };

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Slide panel ── */}
      <div
        ref={panelRef}
        className={`fixed right-0 top-0 bottom-0 z-[70] flex w-[310px] flex-col bg-white shadow-[0_0_60px_rgba(15,15,15,0.22)] transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menú del perfil"
      >
        {/* ── User card ── */}
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-stone-200 bg-stone-100">
              {profileImage ? (
                <img
                  src={resolveUserImage(profileImage)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-stone-400">
                  <User className="h-5 w-5" />
                </div>
              )}
            </div>

            {/* Name + role badge */}
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-stone-950 leading-tight">
                {displayName}
              </p>
              {handle ? (
                <p className="truncate text-[12px] text-stone-400 leading-tight">@{handle}</p>
              ) : null}
              {roleLabel ? (
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ${roleBadge.bg} ${roleBadge.text}`}
                >
                  {roleLabel}
                </span>
              ) : null}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition-colors hover:bg-stone-200"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex flex-1 flex-col overflow-y-auto">

          {/* Role-based links */}
          {roleLinks.length > 0 && (
            <div className="px-3 pt-4 pb-2">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                {sectionLabel}
              </p>
              <div className="space-y-0.5">
                {roleLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <button
                      key={link.to + link.label}
                      onClick={() => handleNavLink(link.to)}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-950 active:bg-stone-100"
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${link.iconBg}`}
                      >
                        <Icon className={`h-4 w-4 ${link.iconColor}`} strokeWidth={1.8} />
                      </div>
                      <span className="flex-1">{link.label}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-stone-300" strokeWidth={2} />
                    </button>
                  );
                })}
              </div>

              {/* CTA — Ver dashboard completo (solo roles profesionales) */}
              {isPro && (
                <button
                  onClick={() => handleNavLink(dashRoute)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 px-3 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-stone-800 active:bg-stone-700"
                >
                  <LayoutDashboard className="h-4 w-4" strokeWidth={1.8} />
                  Ver dashboard completo
                </button>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="mx-5 my-1 border-t border-stone-100" />

          {/* Settings section */}
          <div className="px-3 py-2">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
              Configuración
            </p>
            <div className="space-y-0.5">
              <button
                onClick={() => handleNavLink('/settings/locale')}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-950 active:bg-stone-100"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-stone-100">
                  <Settings className="h-4 w-4 text-stone-500" strokeWidth={1.8} />
                </div>
                <span className="flex-1">Ajustes</span>
                <ChevronRight className="h-3.5 w-3.5 text-stone-300" strokeWidth={2} />
              </button>

              <button
                onClick={() => handleNavLink('/notifications')}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-950 active:bg-stone-100"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                  <Bell className="h-4 w-4 text-amber-600" strokeWidth={1.8} />
                </div>
                <span className="flex-1">Notificaciones</span>
                <ChevronRight className="h-3.5 w-3.5 text-stone-300" strokeWidth={2} />
              </button>

              {onShare ? (
                <button
                  onClick={() => { onShare(); onClose(); }}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-950 active:bg-stone-100"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-100">
                    <Share2 className="h-4 w-4 text-sky-600" strokeWidth={1.8} />
                  </div>
                  <span className="flex-1">Compartir perfil</span>
                  <ChevronRight className="h-3.5 w-3.5 text-stone-300" strokeWidth={2} />
                </button>
              ) : null}
            </div>
          </div>

          {/* Spacer empuja logout al fondo */}
          <div className="flex-1" />

          {/* Logout + branding */}
          <div className="border-t border-stone-100 px-3 py-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 active:bg-red-100"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-50">
                <LogOut className="h-4 w-4 text-red-500" strokeWidth={1.8} />
              </div>
              Cerrar sesión
            </button>

            {/* Branding */}
            <div className="mt-5 flex items-center justify-center gap-2 opacity-40">
              <img src="/logo.png" alt="" className="h-4 w-4 object-contain" />
              <p className="text-[11px] font-medium text-stone-500 tracking-wide">Hispaloshop</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── ProfilePageHeader ─────────────────────────────────────────────────────────
export default function ProfilePageHeader({ username, isOwnProfile, onShare }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b border-stone-100 bg-white/95 backdrop-blur-xl"
        data-testid="profile-page-header"
      >
        <div className="flex h-12 items-center px-2">

          {/* Left — back arrow (perfiles ajenos) · spacer (propio) */}
          {!isOwnProfile ? (
            <button
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-stone-100 active:bg-stone-200"
              aria-label="Volver"
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={2} />
            </button>
          ) : (
            <div className="w-10" aria-hidden="true" />
          )}

          {/* Center — username */}
          <div className="flex flex-1 items-center justify-center gap-1">
            <span className="text-[15px] font-semibold leading-none tracking-tight text-stone-950">
              {username}
            </span>
            {isOwnProfile && (
              <ChevronDown className="h-3.5 w-3.5 text-stone-500" strokeWidth={2.2} />
            )}
          </div>

          {/* Right — share (perfiles ajenos) + hamburger */}
          <div className="flex items-center">
            {!isOwnProfile && onShare ? (
              <button
                onClick={onShare}
                className="flex h-10 w-10 items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-stone-100 active:bg-stone-200"
                aria-label="Compartir perfil"
                data-testid="profile-share-btn"
              >
                <Share2 className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </button>
            ) : null}
            <button
              onClick={() => setMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-stone-100 active:bg-stone-200"
              aria-label="Abrir menú"
              data-testid="profile-hamburger-btn"
            >
              <Menu className="h-5 w-5" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </header>

      <HamburgerPanel
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onShare={onShare}
      />
    </>
  );
}
