// @ts-nocheck
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, User, Lock, Bell, Shield, Eye,
  HelpCircle, MessageSquare, Star, FileText, LogOut, Trash2,
  Link2, Receipt, CreditCard, Store, Globe, Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/* ── Section header ── */
function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-0 pt-5 pb-1.5">
      {children}
    </p>
  );
}

/* ── Icon container ── */
function ItemIcon({ children, className = 'bg-stone-100 text-stone-600' }) {
  return (
    <span className={`w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0 ${className}`}>
      {children}
    </span>
  );
}

/* ── Single settings row ── */
function SettingsItem({ icon, iconClass, label, sublabel, to, onClick, rightContent }) {
  const inner = (
    <div className="flex items-center justify-between py-3 px-2 -mx-2 rounded-xl cursor-pointer group hover:bg-stone-50 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <ItemIcon className={iconClass}>{icon}</ItemIcon>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-stone-950 leading-snug">{label}</p>
          {sublabel && (
            <p className="text-[13px] text-stone-400 truncate mt-0.5">{sublabel}</p>
          )}
        </div>
      </div>
      {rightContent !== undefined
        ? rightContent
        : <ChevronRight size={16} className="text-stone-300 flex-shrink-0" />
      }
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block border-b border-stone-100 last:border-b-0 no-underline">
        {inner}
      </Link>
    );
  }
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onClick) { e.preventDefault(); onClick(); } }}
      className="border-b border-stone-100 last:border-b-0"
    >
      {inner}
    </div>
  );
}

/* ── Settings group card ── */
function SettingsGroup({ children }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 px-4 overflow-hidden">
      {children}
    </div>
  );
}

/* ── Desktop sidebar link ── */
function SettingsSidebarLink({ icon, label, to, active }) {
  const inner = (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors ${
      active ? 'bg-stone-100 font-semibold text-stone-950' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-950'
    }`}>
      <span className="text-stone-500">{icon}</span>
      {label}
    </div>
  );
  if (to) return <Link to={to} className="block no-underline">{inner}</Link>;
  return <div>{inner}</div>;
}

/* ── Toggle ── */
function ToggleSwitch({ value, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      aria-label="Toggle"
      className={`relative w-[44px] h-[26px] rounded-full border-none transition-colors duration-200 flex-shrink-0 ${
        value ? 'bg-stone-950' : 'bg-stone-200'
      } ${disabled ? 'opacity-40 cursor-default' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
        value ? 'left-[21px]' : 'left-[3px]'
      }`} />
    </button>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isPrivate, setIsPrivate] = useState(user?.is_private || false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleting, setDeleting] = useState(false);

  const isProducer = user?.role === 'producer' || user?.role === 'importer';
  const isInfluencer = user?.role === 'influencer';

  const handleTogglePrivate = async (val) => {
    setIsPrivate(val);
    try {
      const apiClient = (await import('../../services/api/client')).default;
      await apiClient.put('/customer/profile', { is_private: val });
      const { toast } = await import('sonner');
      toast.success(val ? 'Cuenta privada activada' : 'Cuenta pública activada');
    } catch {
      setIsPrivate(!val);
      const { toast } = await import('sonner');
      toast.error('Error al cambiar la privacidad');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hsp_token');
    localStorage.removeItem('hsp_accounts');
    logout();
    navigate('/login', { replace: true });
  };

  const handleDeleteAccount = async () => {
    if (deleteEmail !== user?.email) return;
    setDeleting(true);
    try {
      const apiClient = (await import('../../services/api/client')).default;
      await apiClient.delete('/account/delete', { data: { email_confirmation: deleteEmail } });
      localStorage.removeItem('hsp_token');
      localStorage.removeItem('hsp_accounts');
      logout();
      navigate('/login', { replace: true });
    } catch (e) {
      const { toast } = await import('sonner');
      toast.error(e?.response?.data?.detail || 'Error al eliminar la cuenta');
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Topbar */}
      <div className="sticky top-0 z-40 bg-white border-b border-stone-100 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-9 h-9 -ml-1 rounded-full hover:bg-stone-100 transition-colors lg:hidden"
          aria-label="Volver"
        >
          <ArrowLeft size={20} className="text-stone-950" />
        </button>
        <h1 className="text-[17px] font-semibold text-stone-950">Configuración</h1>
      </div>

      <div className="mx-auto max-w-[960px] lg:flex lg:gap-8 lg:px-4">

      {/* ── Desktop sidebar navigation ── */}
      <aside className="hidden lg:block lg:w-[240px] lg:shrink-0 lg:pt-6 lg:pb-8 lg:sticky lg:top-[60px] lg:self-start lg:max-h-[calc(100vh-60px)] lg:overflow-y-auto">
        <nav className="space-y-0.5">
          <SettingsSidebarLink icon={<User size={16} />} label="Editar perfil" to="/settings/profile" />
          <SettingsSidebarLink icon={<Lock size={16} />} label="Contraseña" to="/settings/password" />
          <SettingsSidebarLink icon={<Bell size={16} />} label="Notificaciones" to="/settings/notifications" />
          <SettingsSidebarLink icon={<Eye size={16} />} label="Privacidad" to={null} active />
          <SettingsSidebarLink icon={<Globe size={16} />} label="País e idioma" to="/settings/locale" />
          <SettingsSidebarLink icon={<Shield size={16} />} label="Solicitudes" to="/settings/follow-requests" />
          {(isProducer || isInfluencer) && (
            <>
              <div className="my-2 h-px bg-stone-200" />
              {isProducer && <SettingsSidebarLink icon={<Store size={16} />} label="Editar tienda" to="/producer/store" />}
              {isProducer && <SettingsSidebarLink icon={<CreditCard size={16} />} label="Plan" to="/settings/plan" />}
              <SettingsSidebarLink icon={<Receipt size={16} />} label={isProducer ? 'Datos bancarios' : 'Config. fiscal'} to={isProducer ? '/settings/payout' : '/influencer/fiscal-setup'} />
              {isInfluencer && <SettingsSidebarLink icon={<Link2 size={16} />} label="Links afiliado" to="/influencer/links" />}
            </>
          )}
          <div className="my-2 h-px bg-stone-200" />
          <SettingsSidebarLink icon={<HelpCircle size={16} />} label="Centro de ayuda" to="/ayuda" />
          <SettingsSidebarLink icon={<FileText size={16} />} label="Legal" to="/legal/terminos" />
        </nav>
      </aside>

      <div className="max-w-[600px] mx-auto px-4 pb-28 lg:flex-1 lg:max-w-none lg:pt-6">

        {/* ── CUENTA ── */}
        <SectionLabel>Cuenta</SectionLabel>
        <SettingsGroup>
          <SettingsItem
            icon={<User size={16} />}
            iconClass="bg-stone-100 text-stone-600"
            label="Editar perfil"
            to="/settings/profile"
          />
          <SettingsItem
            icon={<Lock size={16} />}
            iconClass="bg-stone-100 text-stone-600"
            label="Contraseña"
            to="/settings/password"
          />
          <SettingsItem
            icon={<Eye size={16} />}
            iconClass="bg-stone-100 text-stone-600"
            label="Privacidad"
            sublabel={isProducer ? 'Las cuentas de productor son siempre públicas' : (isPrivate ? 'Cuenta privada' : 'Cuenta pública')}
            rightContent={
              isProducer
                ? <ToggleSwitch value={false} onChange={() => {}} disabled />
                : <ToggleSwitch value={isPrivate} onChange={handleTogglePrivate} />
            }
          />
          <SettingsItem
            icon={<Globe size={16} />}
            iconClass="bg-stone-100 text-stone-600"
            label="País e idioma"
            sublabel={user?.country || 'España'}
            to="/settings/locale"
          />
        </SettingsGroup>

        {/* ── NOTIFICACIONES ── */}
        <SectionLabel>Notificaciones</SectionLabel>
        <SettingsGroup>
          <SettingsItem
            icon={<Bell size={16} />}
            iconClass="bg-stone-100 text-stone-600"
            label="Notificaciones push"
            to="/settings/notifications"
          />
          <SettingsItem
            icon={<Shield size={16} />}
            iconClass="bg-stone-100 text-stone-600"
            label="Solicitudes de seguimiento"
            to="/settings/follow-requests"
          />
        </SettingsGroup>

        {/* ── PLAN Y PAGOS ── */}
        {(isProducer || isInfluencer) && (
          <>
            <SectionLabel>Plan y pagos</SectionLabel>
            <SettingsGroup>
              {isProducer && (
                <>
                  <SettingsItem
                    icon={<Store size={16} />}
                    iconClass="bg-stone-100 text-stone-600"
                    label="Editar tienda"
                    to="/producer/store"
                  />
                  <SettingsItem
                    icon={<CreditCard size={16} />}
                    iconClass="bg-stone-100 text-stone-600"
                    label="Plan de suscripción"
                    to="/settings/plan"
                  />
                  <SettingsItem
                    icon={<Receipt size={16} />}
                    iconClass="bg-stone-100 text-stone-600"
                    label="Datos bancarios"
                    to="/settings/payout"
                  />
                </>
              )}
              {isInfluencer && (
                <>
                  <SettingsItem
                    icon={<Receipt size={16} />}
                    iconClass="bg-stone-100 text-stone-600"
                    label="Configuración fiscal"
                    to="/influencer/fiscal-setup"
                  />
                  <SettingsItem
                    icon={<CreditCard size={16} />}
                    iconClass="bg-stone-100 text-stone-600"
                    label="Método de cobro"
                    to="/settings/payout"
                  />
                  <SettingsItem
                    icon={<Link2 size={16} />}
                    iconClass="bg-stone-100 text-stone-600"
                    label="Mis links de afiliado"
                    to="/influencer/links"
                  />
                </>
              )}
            </SettingsGroup>
          </>
        )}

        {/* ── SOPORTE Y LEGAL ── */}
        <SectionLabel>Soporte y legal</SectionLabel>
        <SettingsGroup>
          <SettingsItem
            icon={<HelpCircle size={16} />}
            iconClass="bg-stone-100 text-stone-600"
            label="Centro de ayuda"
            to="/ayuda"
          />
          <SettingsItem
            icon={<MessageSquare size={16} />}
            iconClass="bg-stone-100 text-stone-600"
            label="Contactar soporte"
            to="/contacto"
          />
          <SettingsItem
            icon={<Star size={16} />}
            iconClass="bg-stone-100 text-stone-600"
            label="Valorar la app"
            to="/que-es-hispaloshop"
          />
          <SettingsItem
            icon={<FileText size={16} />}
            iconClass="bg-stone-100 text-stone-600"
            label="Términos y condiciones"
            to="/legal/terminos"
          />
          <SettingsItem
            icon={<Shield size={16} />}
            iconClass="bg-stone-100 text-stone-600"
            label="Política de privacidad"
            to="/legal/privacidad"
          />
        </SettingsGroup>

        {/* ── SESIÓN ── */}
        <div className="mt-6 space-y-2.5">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-stone-200 rounded-full text-[15px] font-semibold text-stone-950 hover:bg-stone-50 transition-colors active:scale-95"
          >
            <LogOut size={17} /> Cerrar sesión
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-3 text-[14px] font-medium text-stone-400 hover:text-stone-600 transition-colors"
          >
            Eliminar cuenta
          </button>
        </div>

        <p className="text-center text-[11px] text-stone-300 mt-4 pb-4">
          Hispaloshop v2.0
        </p>
      </div>
      </div>

      {/* ── Logout Confirm ── */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar cierre de sesión"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-modal p-6 max-w-[340px] w-full text-center"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-[18px] font-semibold text-stone-950 mb-2">¿Cerrar sesión?</h3>
            <p className="text-[14px] text-stone-500 mb-5">
              Tendrás que volver a iniciar sesión para acceder a tu cuenta.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 rounded-full border border-stone-200 text-[14px] font-semibold text-stone-950 hover:bg-stone-50 transition-colors active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 rounded-full bg-stone-950 text-[14px] font-semibold text-white hover:bg-stone-800 transition-colors active:scale-95"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar eliminación de cuenta"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-modal p-6 max-w-[380px] w-full"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-[18px] font-semibold text-stone-950 mb-2">Eliminar cuenta</h3>
            <p className="text-[14px] text-stone-500 mb-4 leading-relaxed">
              Esta acción es irreversible. Se eliminarán todos tus datos, pedidos y contenido.
              Escribe tu email para confirmar.
            </p>
            <input
              type="email"
              value={deleteEmail}
              onChange={e => setDeleteEmail(e.target.value)}
              placeholder={user?.email || 'tu@email.com'}
              aria-label="Confirma tu email para eliminar la cuenta"
              className="w-full h-11 px-3.5 border border-stone-200 rounded-2xl text-[14px] text-stone-950 outline-none focus:border-stone-950 transition-colors mb-4"
            />
            <div className="flex gap-2.5">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteEmail(''); }}
                className="flex-1 py-3 rounded-full border border-stone-200 text-[14px] font-semibold text-stone-950 hover:bg-stone-50 transition-colors active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteEmail !== user?.email || deleting}
                className="flex-1 py-3 rounded-full bg-red-600 text-[14px] font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
