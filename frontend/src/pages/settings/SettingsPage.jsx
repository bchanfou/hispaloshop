import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, User, Lock, Mail, Phone, Globe, MessageSquare,
  Bell, Store, PenTool, CreditCard, BarChart3, Shield, Eye, Ban,
  HelpCircle, Star, FileText, LogOut, Trash2, Link2, Receipt,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, color: 'var(--color-stone)',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '20px 16px 8px', margin: 0,
      fontFamily: 'var(--font-sans)',
    }}>
      {children}
    </p>
  );
}

function SettingsItem({ icon, label, sublabel, to, onClick, rightContent }) {
  const Wrapper = to ? Link : 'div';
  const props = to
    ? { to, style: { textDecoration: 'none', color: 'inherit' } }
    : { onClick, role: 'button', tabIndex: 0 };

  return (
    <Wrapper {...props}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        borderBottom: '1px solid var(--color-border)',
        cursor: 'pointer',
        transition: 'var(--transition-fast)',
      }}>
        <span style={{ color: 'var(--color-stone)', flexShrink: 0, display: 'flex' }}>
          {icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-black)', margin: 0, fontFamily: 'var(--font-sans)' }}>
            {label}
          </p>
          {sublabel && (
            <p style={{ fontSize: 13, color: 'var(--color-stone)', margin: '2px 0 0', fontFamily: 'var(--font-sans)' }}>
              {sublabel}
            </p>
          )}
        </div>
        {rightContent || <ChevronRight size={16} color="var(--color-stone)" />}
      </div>
    </Wrapper>
  );
}

function ToggleSwitch({ value, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? 'var(--color-black)' : 'var(--color-border)',
        border: 'none', cursor: disabled ? 'default' : 'pointer',
        position: 'relative', transition: 'background 200ms',
        opacity: disabled ? 0.5 : 1, flexShrink: 0,
        padding: 0,
      }}
      aria-label="Toggle"
    >
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        background: 'var(--color-white)',
        position: 'absolute', top: 2,
        left: value ? 22 : 2,
        transition: 'left 200ms',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
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
  const font = { fontFamily: 'var(--font-sans)' };

  const handleTogglePrivate = async (val) => {
    setIsPrivate(val);
    try {
      const apiClient = (await import('../../services/api/client')).default;
      await apiClient.put('/customer/profile', { is_private: val });
    } catch {
      setIsPrivate(!val);
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
      await apiClient.delete('/account/delete');
      localStorage.removeItem('hsp_token');
      localStorage.removeItem('hsp_accounts');
      navigate('/login', { replace: true });
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)', ...font }}>
      {/* Topbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
          aria-label="Volver">
          <ArrowLeft size={22} color="var(--color-black)" />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-black)' }}>Configuración</span>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 100 }}>
        {/* ── CUENTA ── */}
        <SectionLabel>Cuenta</SectionLabel>
        <div style={{ background: 'var(--color-white)', borderTop: '1px solid var(--color-border)' }}>
          <SettingsItem icon={<User size={20} />} label="Editar perfil" to="/settings/profile" />
          <SettingsItem icon={<Lock size={20} />} label="Contraseña" to="/settings/password" />
          <SettingsItem icon={<Mail size={20} />} label="Email" sublabel={user?.email || 'Sin configurar'} to="/settings/email" />
          <SettingsItem icon={<Phone size={20} />} label="Teléfono" sublabel={user?.phone || 'Sin configurar'} to="/settings/phone" />
        </div>

        {/* ── PREFERENCIAS ── */}
        <SectionLabel>Preferencias</SectionLabel>
        <div style={{ background: 'var(--color-white)', borderTop: '1px solid var(--color-border)' }}>
          <SettingsItem icon={<Globe size={20} />} label="País e idioma" sublabel={user?.country || 'España'} to="/settings/locale" />
          <SettingsItem icon={<Bell size={20} />} label="Notificaciones" to="/settings/notifications" />
        </div>

        {/* ── MI TIENDA (producer/importer) ── */}
        {isProducer && (
          <>
            <SectionLabel>Mi tienda</SectionLabel>
            <div style={{ background: 'var(--color-white)', borderTop: '1px solid var(--color-border)' }}>
              <SettingsItem icon={<Store size={20} />} label="Editar tienda" to="/settings/store" />
              <SettingsItem icon={<PenTool size={20} />} label="Firma digital" to="/settings/signature" />
              <SettingsItem icon={<CreditCard size={20} />} label="Datos bancarios" to="/settings/payout" />
              <SettingsItem icon={<BarChart3 size={20} />} label="Plan de suscripción" to="/settings/plan" />
            </div>
          </>
        )}

        {/* ── AFILIADOS (influencer) ── */}
        {isInfluencer && (
          <>
            <SectionLabel>Afiliados</SectionLabel>
            <div style={{ background: 'var(--color-white)', borderTop: '1px solid var(--color-border)' }}>
              <SettingsItem icon={<Receipt size={20} />} label="Configuración fiscal" to="/influencer/fiscal-setup" />
              <SettingsItem icon={<CreditCard size={20} />} label="Método de cobro" to="/settings/payout" />
              <SettingsItem icon={<Link2 size={20} />} label="Mis links" to="/influencer/links" />
            </div>
          </>
        )}

        {/* ── PRIVACIDAD ── */}
        <SectionLabel>Privacidad</SectionLabel>
        <div style={{ background: 'var(--color-white)', borderTop: '1px solid var(--color-border)' }}>
          <SettingsItem icon={<Shield size={20} />} label="Privacidad" to="/settings/privacy" />
          <SettingsItem
            icon={<Eye size={20} />}
            label="Cuenta privada"
            sublabel="Solo seguidores ven tu perfil"
            rightContent={<ToggleSwitch value={isPrivate} onChange={handleTogglePrivate} />}
          />
          <SettingsItem icon={<Ban size={20} />} label="Usuarios bloqueados" to="/settings/blocked" />
        </div>

        {/* ── SOPORTE ── */}
        <SectionLabel>Soporte</SectionLabel>
        <div style={{ background: 'var(--color-white)', borderTop: '1px solid var(--color-border)' }}>
          <SettingsItem icon={<HelpCircle size={20} />} label="Centro de ayuda"
            onClick={() => window.open('https://help.hispaloshop.com', '_blank')} />
          <SettingsItem icon={<MessageSquare size={20} />} label="Contactar soporte" to="/contacto" />
          <SettingsItem icon={<Star size={20} />} label="Valorar la app"
            onClick={() => window.open('https://hispaloshop.com', '_blank')} />
          <SettingsItem icon={<FileText size={20} />} label="Términos y condiciones" to="/legal/terminos" />
          <SettingsItem icon={<Shield size={20} />} label="Política de privacidad" to="/legal/privacidad" />
        </div>

        {/* ── SESIÓN ── */}
        <div style={{ padding: '24px 16px' }}>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              width: '100%', padding: 14,
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              fontSize: 15, fontWeight: 600, color: 'var(--color-black)',
              cursor: 'pointer', ...font,
              marginBottom: 10,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <LogOut size={18} /> Cerrar sesión
            </span>
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              width: '100%', padding: 10,
              background: 'none', border: 'none',
              fontSize: 14, fontWeight: 500, color: 'var(--color-red)',
              cursor: 'pointer', ...font,
            }}
          >
            Eliminar cuenta
          </button>
        </div>

        {/* Version */}
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-stone)', padding: '0 0 20px' }}>
          Hispaloshop v2.0
        </p>
      </div>

      {/* ── Logout Confirm ── */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div style={{
            background: 'var(--color-white)', borderRadius: 'var(--radius-xl)',
            padding: 24, maxWidth: 340, width: '100%', textAlign: 'center',
          }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-black)', margin: '0 0 8px', ...font }}>
              ¿Cerrar sesión?
            </h3>
            <p style={{ fontSize: 14, color: 'var(--color-stone)', margin: '0 0 20px', ...font }}>
              Tendrás que volver a iniciar sesión para acceder a tu cuenta.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1, padding: 12, borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-white)', color: 'var(--color-black)',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', ...font,
                }}>
                Cancelar
              </button>
              <button onClick={handleLogout}
                style={{
                  flex: 1, padding: 12, borderRadius: 'var(--radius-lg)',
                  border: 'none', background: 'var(--color-black)', color: 'var(--color-white)',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', ...font,
                }}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div style={{
            background: 'var(--color-white)', borderRadius: 'var(--radius-xl)',
            padding: 24, maxWidth: 380, width: '100%',
          }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-red)', margin: '0 0 8px', ...font }}>
              Eliminar cuenta
            </h3>
            <p style={{ fontSize: 14, color: 'var(--color-stone)', margin: '0 0 16px', lineHeight: 1.5, ...font }}>
              Esta acción es irreversible. Se eliminarán todos tus datos, pedidos y contenido.
              Escribe tu email para confirmar.
            </p>
            <input
              type="email"
              value={deleteEmail}
              onChange={e => setDeleteEmail(e.target.value)}
              placeholder={user?.email || 'tu@email.com'}
              style={{
                width: '100%', height: 44, padding: '0 14px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                fontSize: 14, color: 'var(--color-black)',
                outline: 'none', boxSizing: 'border-box',
                marginBottom: 16, ...font,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteEmail(''); }}
                style={{
                  flex: 1, padding: 12, borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-white)', color: 'var(--color-black)',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', ...font,
                }}>
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteEmail !== user?.email || deleting}
                style={{
                  flex: 1, padding: 12, borderRadius: 'var(--radius-lg)',
                  border: 'none', background: 'var(--color-red)', color: 'var(--color-white)',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  opacity: (deleteEmail !== user?.email || deleting) ? 0.5 : 1, ...font,
                }}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
