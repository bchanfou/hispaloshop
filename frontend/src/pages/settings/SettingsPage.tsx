// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, User, Lock, Bell, Shield, Eye, HelpCircle, MessageSquare, Star, FileText, LogOut, Trash2, Link2, Receipt, CreditCard, Store, Globe, Check, MapPin, Trophy, Download, Moon, UserPlus, Users, Cookie, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { trackEvent } from '../../utils/analytics';
import { useTranslation } from 'react-i18next';

/* ── Section header ── */
import i18n from "../../locales/i18n";
function SectionLabel({
  children
}) {
  return <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-0 pt-5 pb-1.5">
      {children}
    </p>;
}

/* ── Icon container ── */
function ItemIcon({
  children,
  className = 'bg-stone-100 text-stone-600'
}) {
  return <span className={`w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0 ${className}`}>
      {children}
    </span>;
}

/* ── Single settings row ── */
function SettingsItem({
  icon,
  iconClass,
  label,
  sublabel,
  to,
  onClick,
  rightContent
}) {
  const inner = <div className="flex items-center justify-between py-3 px-2 -mx-2 rounded-xl cursor-pointer group hover:bg-stone-50 active:bg-stone-100 active:scale-[0.98] transition-all duration-150">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <ItemIcon className={iconClass}>{icon}</ItemIcon>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-stone-950 leading-snug">{label}</p>
          {sublabel && <p className="text-[13px] text-stone-400 truncate mt-0.5">{sublabel}</p>}
        </div>
      </div>
      {rightContent !== undefined ? rightContent : <ChevronRight size={16} className="text-stone-300 flex-shrink-0" />}
    </div>;
  if (to) {
    return <Link to={to} className="block border-b border-stone-100 last:border-b-0 no-underline">
        {inner}
      </Link>;
  }
  return <div role="button" tabIndex={0} onClick={onClick} onKeyDown={e => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  }} className="border-b border-stone-100 last:border-b-0">
      {inner}
    </div>;
}

/* ── Settings group card ── */
function SettingsGroup({
  children
}) {
  return <div className="bg-white rounded-2xl border border-stone-100 px-4 overflow-hidden">
      {children}
    </div>;
}

/* ── Desktop sidebar link ── */
function SettingsSidebarLink({
  icon,
  label,
  to,
  active
}) {
  const inner = <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors ${active ? 'bg-stone-100 font-semibold text-stone-950' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-950'}`}>
      <span className="text-stone-500">{icon}</span>
      {label}
    </div>;
  if (to) return <Link to={to} className="block no-underline">{inner}</Link>;
  return <div>{inner}</div>;
}

/* ── Toggle ── */
function ToggleSwitch({
  value,
  onChange,
  disabled
}) {
  return <button onClick={() => !disabled && onChange(!value)} disabled={disabled} aria-label="Toggle" className={`relative w-[44px] h-[26px] rounded-full border-none transition-colors duration-200 flex-shrink-0 ${value ? 'bg-stone-950' : 'bg-stone-200'} ${disabled ? 'opacity-40 cursor-default' : 'cursor-pointer'}`}>
      <span className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${value ? 'left-[21px]' : 'left-[3px]'}`} />
    </button>;
}
export default function SettingsPage() {
  const navigate = useNavigate();
  const {
    user,
    logout,
    logoutAccount
  } = useAuth();
  const [isPrivate, setIsPrivate] = useState(user?.is_private || false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [showCookieConfig, setShowCookieConfig] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  useEffect(() => {
    setIsPrivate(user?.is_private || false);
  }, [user?.is_private]);
  const isProducer = user?.role === 'producer' || user?.role === 'importer';
  const isInfluencer = user?.role === 'influencer';
  const handleTogglePrivate = async val => {
    setIsPrivate(val);
    try {
      await apiClient.put('/customer/profile', {
        is_private: val
      });
      toast.success(val ? 'Cuenta privada activada' : i18n.t('settings.cuentaPublicaActivada', 'Cuenta pública activada'));
    } catch {
      setIsPrivate(!val);
      toast.error(i18n.t('settings.errorAlCambiarLaPrivacidad', 'Error al cambiar la privacidad'));
    }
  };
  const handleLogout = async () => {
    if (logoutAccount) {
      // Use multi-account aware logout — switches to fallback account if available
      const result = await logoutAccount(user);
      if (result?.switched && result?.user) {
        toast.success(i18n.t('settings.sesionCerradaCambiadoAOtraCuenta', 'Sesión cerrada. Cambiado a otra cuenta.'));
        navigate(result.user.username ? `/${result.user.username}` : '/', {
          replace: true
        });
        return;
      }
    }
    // Fallback: normal logout of the current account only.
    // logout() now preserves other saved accounts and auto-switches when possible.
    // B6 fix (4.5d): do NOT wipe hsp_accounts here — that closed ALL accounts.
    logout();
  };
  const handleDeleteAccount = async () => {
    if (deleteEmail !== user?.email) return;
    setDeleting(true);
    try {
      await apiClient.delete('/account/delete', {
        data: {
          email_confirmation: deleteEmail
        }
      });
      // Account deleted server-side. Use logout() which now removes ONLY this
      // account from hsp_accounts and auto-switches to a remaining valid one.
      logout();
    } catch (e) {
      toast.error(e?.response?.data?.detail || i18n.t('settings.errorAlEliminarLaCuenta', 'Error al eliminar la cuenta'));
      setDeleting(false);
    }
  };
  const handleDeactivateAccount = async () => {
    setDeactivating(true);
    try {
      const res = await apiClient.post('/account/deactivate');
      toast.success(res?.data?.message || 'Cuenta desactivada. Tienes 30 dias para recuperarla.');
      // Use logout() which preserves other saved accounts and auto-switches.
      logout();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Error al desactivar la cuenta');
      setDeactivating(false);
    }
  };
  const handleExportData = async () => {
    setExportingData(true);
    try {
      trackEvent('data_export_requested');
      const result = await apiClient.post('/users/me/data-export', {});
      if (result?.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hispaloshop_data_export_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(i18n.t('settings_page.data_downloaded', 'Datos descargados'));
      }
    } catch (e) {
      const detail = e?.response?.data?.detail;
      if (e?.response?.status === 429) {
        toast.error(detail || 'Solo puedes solicitar una descarga por dia.');
      } else {
        toast.error(i18n.t('settings_page.data_error', 'Error al descargar los datos'));
      }
    } finally {
      setExportingData(false);
    }
  };
  return <div className="min-h-screen bg-stone-50">
      {/* Topbar */}
      <div className="sticky top-[52px] lg:top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-stone-100 flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate(-1)} className="flex items-center justify-center w-9 h-9 -ml-1 rounded-full hover:bg-stone-100 transition-colors lg:hidden" aria-label="Volver">
          <ArrowLeft size={20} className="text-stone-950" />
        </button>
        <h1 className="text-[17px] font-semibold text-stone-950">{i18n.t('community.configuracion', 'Configuración')}</h1>
      </div>

      <div className="mx-auto max-w-[960px] lg:flex lg:gap-8 lg:px-4">

      {/* ── Desktop sidebar navigation ── */}
      <aside className="hidden lg:block lg:w-[240px] lg:shrink-0 lg:pt-6 lg:pb-8 lg:sticky lg:top-[60px] lg:self-start lg:max-h-[calc(100vh-60px)] lg:overflow-y-auto">
        <nav className="space-y-0.5">
          <SettingsSidebarLink icon={<User size={16} />} label={i18n.t('settings_page.edit_profile', 'Editar perfil')} to="/settings/profile" />
          <SettingsSidebarLink icon={<Lock size={16} />} label={i18n.t('auth.password', 'Contraseña')} to="/settings/password" />
          <SettingsSidebarLink icon={<MapPin size={16} />} label={i18n.t('settings_page.addresses', 'Direcciones')} to="/settings/addresses" />
          <SettingsSidebarLink icon={<Bell size={16} />} label={i18n.t('settings_page.notifications', 'Notificaciones')} to="/settings/notifications" />
          <SettingsSidebarLink icon={<Globe size={16} />} label={i18n.t('settings.paisEIdioma', 'País e idioma')} to="/settings/locale" />
          <SettingsSidebarLink icon={<Eye size={16} />} label={i18n.t('settings_page.privacy_toggle', 'Privacidad')} to={null} active />
          <SettingsSidebarLink icon={<Trophy size={16} />} label={i18n.t('settings_page.level_xp', 'Nivel y XP')} to="/settings/gamification" />
          {(isProducer || isInfluencer) && <>
              <div className="my-2 h-px bg-stone-200" />
              {isProducer && <SettingsSidebarLink icon={<Store size={16} />} label="Editar tienda" to="/producer/store" />}
              {isProducer && <SettingsSidebarLink icon={<CreditCard size={16} />} label="Plan" to="/settings/plan" />}
              <SettingsSidebarLink icon={<Receipt size={16} />} label={isProducer ? 'Datos bancarios' : 'Config. fiscal'} to={isProducer ? '/settings/payout' : '/influencer/fiscal-setup'} />
              {isInfluencer && <SettingsSidebarLink icon={<Link2 size={16} />} label="Links afiliado" to="/influencer/links" />}
            </>}
          <div className="my-2 h-px bg-stone-200" />
          <SettingsSidebarLink icon={<HelpCircle size={16} />} label="Centro de ayuda" to="/contacto" />
          <SettingsSidebarLink icon={<FileText size={16} />} label="Legal" to="/legal/terminos" />
        </nav>
      </aside>

      <div className="max-w-[600px] mx-auto px-4 pb-28 lg:flex-1 lg:max-w-none lg:pt-6">

        {/* ── CUENTA ── */}
        <SectionLabel>{i18n.t('settings_page.account', 'Cuenta')}</SectionLabel>
        <SettingsGroup>
          <SettingsItem icon={<User size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('settings_page.edit_profile', 'Editar perfil')} to="/settings/profile" />
          <SettingsItem icon={<Lock size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('auth.password', 'Contraseña')} to="/settings/password" />
          <SettingsItem icon={<MapPin size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('settings_page.addresses', 'Direcciones guardadas')} to="/settings/addresses" />
          <SettingsItem icon={<CreditCard size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('settings_page.payment_methods', 'Metodos de pago')} sublabel={i18n.t('settings_page.managed_by_stripe', 'Gestionado por Stripe')} to="/settings/plan" />
        </SettingsGroup>

        {/* ── PREFERENCIAS ── */}
        <SectionLabel>{i18n.t('settings_page.preferences', 'Preferencias')}</SectionLabel>
        <SettingsGroup>
          <SettingsItem icon={<Globe size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('settings.paisEIdioma', 'País e idioma')} sublabel={user?.country || i18n.t('admin.countries.ES', 'España')} to="/settings/locale" />
          <SettingsItem icon={<Bell size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('settings_page.notifications', 'Notificaciones')} to="/settings/notifications" />
          <SettingsItem icon={<Eye size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('settings_page.privacy_toggle', 'Privacidad')} sublabel={isProducer ? i18n.t('settings.lasCuentasDeProductorSonSiemprePub', 'Las cuentas de productor son siempre públicas') : isPrivate ? i18n.t('settings_page.private', 'Cuenta privada') : i18n.t('settings_page.public', 'Cuenta publica')} rightContent={isProducer ? <ToggleSwitch value={false} onChange={() => {}} disabled /> : <ToggleSwitch value={isPrivate} onChange={handleTogglePrivate} />} />
          <SettingsItem icon={<Shield size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('settings_page.follow_requests', 'Solicitudes de seguimiento')} to="/settings/follow-requests" />
        </SettingsGroup>

        {/* ── CUENTAS ── */}
        <SectionLabel>{i18n.t('settings_page.accounts', 'Cuentas')}</SectionLabel>
        <SettingsGroup>
          <SettingsItem icon={<Users size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('settings_page.switch_account', 'Cambiar cuenta')} sublabel={i18n.t('settings_page.switch_desc', 'Toca tu avatar en el perfil para cambiar')} onClick={() => navigate(user?.username ? `/${user.username}` : '/profile')} />
          <SettingsItem icon={<UserPlus size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('settings_page.add_account', 'Anadir cuenta')} to="/login?add_account=true" />
        </SettingsGroup>

        {/* ── GAMIFICACIÓN ── */}
        <SectionLabel>{i18n.t('settings_page.gamification', 'Gamificacion')}</SectionLabel>
        <SettingsGroup>
          <SettingsItem icon={<Trophy size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('settings_page.level_xp', 'Nivel y XP')} to="/settings/gamification" />
        </SettingsGroup>

        {/* ── PRIVACIDAD Y DATOS ── */}
        <SectionLabel>{i18n.t('settings_page.privacy_data', 'Privacidad y datos')}</SectionLabel>
        <SettingsGroup>
          <SettingsItem icon={<Shield size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('settings_page.ai_consent', 'Consentimiento IA')} to="/settings/profile" />
          <SettingsItem icon={<Cookie size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('settings_page.manage_cookies', 'Gestionar cookies')} sublabel={i18n.t('settings_page.manage_cookies_desc', 'Esenciales, analitica, marketing, IA')} onClick={() => {
            localStorage.removeItem('hispaloshop_consent_v2');
            window.location.reload();
          }} />
          <SettingsItem icon={<Download size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('settings_page.download_data', 'Descargar mis datos')} sublabel={i18n.t('settings_page.download_data_desc', '1 descarga por dia (RGPD Art. 15+20)')} onClick={handleExportData} rightContent={exportingData ? <span className="text-[12px] text-stone-400">Descargando...</span> : <ChevronRight size={16} className="text-stone-300 flex-shrink-0" />} />
          <SettingsItem icon={<Pause size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('settings_page.deactivate_account', 'Desactivar cuenta')} sublabel={i18n.t('settings_page.deactivate_desc', '30 dias para recuperar')} onClick={() => setShowDeleteConfirm(true)} />
          <SettingsItem icon={<Trash2 size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('settings_page.delete_account', 'Eliminar mi cuenta')} onClick={() => setShowDeleteConfirm(true)} />
        </SettingsGroup>

        {/* ── PLAN Y PAGOS ── */}
        {(isProducer || isInfluencer) && <>
            <SectionLabel>Plan y pagos</SectionLabel>
            <SettingsGroup>
              {isProducer && <>
                  <SettingsItem icon={<Store size={16} />} iconClass="bg-stone-100 text-stone-600" label="Editar tienda" to="/producer/store" />
                  <SettingsItem icon={<CreditCard size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('settings.planDeSuscripcion', 'Plan de suscripción')} to="/settings/plan" />
                  <SettingsItem icon={<Receipt size={16} />} iconClass="bg-stone-100 text-stone-600" label="Datos bancarios" to="/settings/payout" />
                </>}
              {isInfluencer && <>
                  <SettingsItem icon={<Receipt size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('fiscal_setup.configuracionFiscal', 'Configuración fiscal')} to="/influencer/fiscal-setup" />
                  <SettingsItem icon={<CreditCard size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('producer_payments.metodoDeCobro', 'Método de cobro')} to="/settings/payout" />
                  <SettingsItem icon={<Link2 size={16} />} iconClass="bg-stone-100 text-stone-600" label="Mis links de afiliado" to="/influencer/links" />
                </>}
            </SettingsGroup>
          </>}

        {/* ── SOPORTE Y LEGAL ── */}
        <SectionLabel>Soporte y legal</SectionLabel>
        <SettingsGroup>
          <SettingsItem icon={<HelpCircle size={16} />} iconClass="bg-stone-100 text-stone-600" label="Centro de ayuda" to="/contacto" />
          <SettingsItem icon={<MessageSquare size={16} />} iconClass="bg-stone-100 text-stone-600" label="Contactar soporte" to="/contacto" />
          <SettingsItem icon={<Star size={16} />} iconClass="bg-stone-100 text-stone-600" label="Valorar la app" to="/que-es" />
          <SettingsItem icon={<FileText size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('register.terminosYCondiciones', 'Términos y condiciones')} to="/legal/terminos" />
          <SettingsItem icon={<Shield size={16} />} iconClass="bg-stone-100 text-stone-600" label={i18n.t('register.politicaDePrivacidad', 'Política de privacidad')} to="/legal/privacidad" />
        </SettingsGroup>

        {/* ── SESIÓN ── */}
        <div className="mt-6 space-y-2.5">
          <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-stone-200 rounded-full text-[15px] font-semibold text-stone-950 hover:bg-stone-50 transition-colors active:scale-95">
            <LogOut size={17} /> Cerrar sesión
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-3 text-[14px] font-medium text-stone-500 hover:text-stone-950 transition-colors">
            Eliminar cuenta
          </button>
        </div>

        <p className="text-center text-[11px] text-stone-300 mt-4 pb-4">
          Hispaloshop v2.0
        </p>
      </div>
      </div>

      {/* ── Logout Confirm ── */}
      {showLogoutConfirm && <div className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={i18n.t('settings.confirmarCierreDeSesion', 'Confirmar cierre de sesión')} onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-modal p-6 max-w-[340px] w-full text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-[18px] font-semibold text-stone-950 mb-2">¿Cerrar sesión?</h3>
            <p className="text-[14px] text-stone-500 mb-5">
              Tendrás que volver a iniciar sesión para acceder a tu cuenta.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 rounded-full border border-stone-200 text-[14px] font-semibold text-stone-950 hover:bg-stone-50 transition-colors active:scale-95">
                Cancelar
              </button>
              <button onClick={handleLogout} className="flex-1 py-3 rounded-full bg-stone-950 text-[14px] font-semibold text-white hover:bg-stone-800 transition-colors active:scale-95">
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>}

      {/* ── Delete / Deactivate Confirm ── */}
      {showDeleteConfirm && <div className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={i18n.t('settings.confirmarEliminacionDeCuenta', 'Confirmar eliminación de cuenta')} onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-modal p-6 max-w-[400px] w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-[18px] font-semibold text-stone-950 mb-2">Gestionar cuenta</h3>
            <p className="text-[14px] text-stone-500 mb-5 leading-relaxed">
              Elige como quieres proceder con tu cuenta.
            </p>

            {/* Option 1: Deactivate (30d grace) */}
            <div className="p-4 border border-stone-200 rounded-2xl mb-3">
              <div className="flex items-start gap-3 mb-3">
                <Pause size={18} className="text-stone-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[14px] font-semibold text-stone-950">Desactivar (30 dias para recuperar)</p>
                  <p className="text-[12px] text-stone-500 leading-relaxed mt-1">
                    Tu cuenta se ocultara. Si inicias sesion dentro de 30 dias, se reactivara automaticamente.
                  </p>
                </div>
              </div>
              <button onClick={handleDeactivateAccount} disabled={deactivating} className="w-full py-2.5 rounded-full border border-stone-200 text-[13px] font-semibold text-stone-950 hover:bg-stone-50 transition-colors disabled:opacity-40 active:scale-95">
                {deactivating ? 'Desactivando...' : 'Desactivar cuenta'}
              </button>
            </div>

            {/* Option 2: Permanent delete */}
            <div className="p-4 border border-stone-200 rounded-2xl mb-4">
              <div className="flex items-start gap-3 mb-3">
                <Trash2 size={18} className="text-stone-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[14px] font-semibold text-stone-950">Eliminar permanentemente</p>
                  <p className="text-[12px] text-stone-500 leading-relaxed mt-1">
                    Esta accion es irreversible. Se eliminaran todos tus datos, pedidos y contenido. Escribe tu email para confirmar.
                  </p>
                </div>
              </div>
              <input type="email" value={deleteEmail} onChange={e => setDeleteEmail(e.target.value)} placeholder={user?.email || 'tu@email.com'} aria-label={i18n.t('settings.confirmaTuEmailParaEliminarLaCuent', 'Confirma tu email para eliminar la cuenta')} className="w-full h-10 px-3.5 border border-stone-200 rounded-xl text-[13px] text-stone-950 outline-none focus:border-stone-950 transition-colors mb-2.5" />
              <button onClick={handleDeleteAccount} disabled={deleteEmail !== user?.email || deleting} className="w-full py-2.5 rounded-full bg-stone-950 text-[13px] font-semibold text-white hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95">
                {deleting ? 'Eliminando...' : 'Eliminar permanentemente'}
              </button>
            </div>

            <button onClick={() => { setShowDeleteConfirm(false); setDeleteEmail(''); }} className="w-full py-3 rounded-full border border-stone-200 text-[14px] font-semibold text-stone-950 hover:bg-stone-50 transition-colors active:scale-95">
              Cancelar
            </button>
          </div>
        </div>}
    </div>;
}