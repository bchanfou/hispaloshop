// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';

function ToggleSwitch({ value, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? '#0c0a09' : '#e7e5e4',
        border: 'none', cursor: disabled ? 'default' : 'pointer',
        position: 'relative', transition: 'background 200ms',
        opacity: disabled ? 0.6 : 1, flexShrink: 0, padding: 0,
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        background: '#ffffff',
        position: 'absolute', top: 2,
        left: value ? 22 : 2,
        transition: 'left 200ms',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
    </button>
  );
}

function ToggleRow({ label, sublabel, value, onChange, disabled, locked }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px',
      borderBottom: '1px solid #e7e5e4',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: '#0c0a09', margin: 0, fontFamily: 'inherit' }}>
          {label}
        </p>
        {sublabel && (
          <p style={{ fontSize: 12, color: '#78716c', margin: '2px 0 0', fontFamily: 'inherit' }}>
            {sublabel}
          </p>
        )}
      </div>
      {locked ? (
        <Lock size={16} color="#78716c" />
      ) : (
        <ToggleSwitch value={value} onChange={onChange} disabled={disabled} />
      )}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, color: '#78716c',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '20px 16px 8px', margin: 0,
      fontFamily: 'inherit',
    }}>
      {children}
    </p>
  );
}

const DEFAULT_PREFS = {
  new_followers: true,
  likes: true,
  comments: true,
  mentions: true,
  order_confirmation: true,
  shipping_updates: true,
  order_delivered: true,
  review_requests: true,
  b2b_offers: true,
  b2b_contracts: true,
  b2b_payments: true,
  platform_news: true,
  marketing_emails: false,
};

export default function NotificationsSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  const isProducer = user?.role === 'producer' || user?.role === 'importer';
  const font = { fontFamily: 'inherit' };

  useEffect(() => {
    (async () => {
      try {
        const data = await apiClient.get('/notifications/preferences');
        if (data) setPrefs(p => ({ ...p, ...data }));
      } catch { /* use defaults */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleToggle = async (key, val) => {
    setPrefs(p => ({ ...p, [key]: val }));
    try {
      await apiClient.put('/notifications/preferences', { [key]: val });
    } catch {
      setPrefs(p => ({ ...p, [key]: !val }));
      toast.error('Error al actualizar');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf9', ...font }}>
      {/* Topbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: '#ffffff',
        borderBottom: '1px solid #e7e5e4',
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      }}>
        <button onClick={() => navigate('/settings')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <ArrowLeft size={22} color="#0c0a09" />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#0c0a09' }}>Notificaciones</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Loader2 size={28} color="#78716c" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 100 }}>
          {/* ACTIVIDAD SOCIAL */}
          <SectionLabel>Actividad social</SectionLabel>
          <div style={{ background: '#ffffff', borderTop: '1px solid #e7e5e4' }}>
            <ToggleRow label="Nuevos seguidores" sublabel="Cuando alguien te sigue"
              value={prefs.new_followers} onChange={v => handleToggle('new_followers', v)} />
            <ToggleRow label="Me gusta en posts" sublabel="Cuando alguien da like a tu contenido"
              value={prefs.likes} onChange={v => handleToggle('likes', v)} />
            <ToggleRow label="Comentarios" sublabel="Cuando alguien comenta"
              value={prefs.comments} onChange={v => handleToggle('comments', v)} />
            <ToggleRow label="Menciones" sublabel="Cuando alguien te menciona"
              value={prefs.mentions} onChange={v => handleToggle('mentions', v)} />
          </div>

          {/* PEDIDOS */}
          <SectionLabel>Pedidos</SectionLabel>
          <div style={{ background: '#ffffff', borderTop: '1px solid #e7e5e4' }}>
            <ToggleRow label="Confirmación de pedido" value={true} locked disabled />
            <ToggleRow label="Actualizaciones de envío" sublabel="Cuando tu pedido esté en camino"
              value={prefs.shipping_updates} onChange={v => handleToggle('shipping_updates', v)} />
            <ToggleRow label="Pedido entregado"
              value={prefs.order_delivered} onChange={v => handleToggle('order_delivered', v)} />
            <ToggleRow label="Solicitudes de reseña"
              value={prefs.review_requests} onChange={v => handleToggle('review_requests', v)} />
          </div>

          {/* B2B */}
          {isProducer && (
            <>
              <SectionLabel>B2B</SectionLabel>
              <div style={{ background: '#ffffff', borderTop: '1px solid #e7e5e4' }}>
                <ToggleRow label="Nuevas ofertas B2B"
                  value={prefs.b2b_offers} onChange={v => handleToggle('b2b_offers', v)} />
                <ToggleRow label="Actualizaciones de contratos"
                  value={prefs.b2b_contracts} onChange={v => handleToggle('b2b_contracts', v)} />
                <ToggleRow label="Pagos recibidos"
                  value={prefs.b2b_payments} onChange={v => handleToggle('b2b_payments', v)} />
              </div>
            </>
          )}

          {/* PLATAFORMA */}
          <SectionLabel>Plataforma</SectionLabel>
          <div style={{ background: '#ffffff', borderTop: '1px solid #e7e5e4' }}>
            <ToggleRow label="Novedades de Hispaloshop" sublabel="Nuevas funcionalidades y anuncios"
              value={prefs.platform_news} onChange={v => handleToggle('platform_news', v)} />
            <ToggleRow label="Emails de marketing" sublabel="Ofertas y descuentos especiales"
              value={prefs.marketing_emails} onChange={v => handleToggle('marketing_emails', v)} />
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
