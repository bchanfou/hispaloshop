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
      className={`w-11 h-6 rounded-full border-none relative transition-colors duration-200 shrink-0 p-0 ${
        disabled ? 'opacity-60 cursor-default' : 'cursor-pointer'
      } ${value ? 'bg-stone-950' : 'bg-stone-200'}`}
    >
      <div
        className="w-5 h-5 rounded-full bg-white absolute top-0.5 shadow-sm transition-[left] duration-200"
        style={{ left: value ? 22 : 2 }}
      />
    </button>
  );
}

function ToggleRow({ label, sublabel, value, onChange, disabled, locked }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-200">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-950">
          {label}
        </p>
        {sublabel && (
          <p className="text-xs text-stone-500 mt-0.5">
            {sublabel}
          </p>
        )}
      </div>
      {locked ? (
        <Lock size={16} className="text-stone-500" />
      ) : (
        <ToggleSwitch value={value} onChange={onChange} disabled={disabled} />
      )}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-bold text-stone-500 tracking-wider uppercase px-4 pt-5 pb-2">
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
      await apiClient.patch('/notifications/preferences', { [key]: val });
      toast.success('Preferencias guardadas');
    } catch {
      setPrefs(p => ({ ...p, [key]: !val }));
      toast.error('Error al actualizar');
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Topbar */}
      <div className="sticky top-0 z-40 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate('/settings')}
          className="bg-transparent border-none cursor-pointer p-1 flex"
        >
          <ArrowLeft size={22} className="text-stone-950" />
        </button>
        <span className="text-[17px] font-bold text-stone-950">Notificaciones</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={28} className="text-stone-500 animate-spin" />
        </div>
      ) : (
        <div className="max-w-[600px] mx-auto pb-[100px]">
          {/* ACTIVIDAD SOCIAL */}
          <SectionLabel>Actividad social</SectionLabel>
          <div className="bg-white border-t border-stone-200">
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
          <div className="bg-white border-t border-stone-200">
            <ToggleRow label="Confirmacion de pedido" value={true} locked disabled />
            <ToggleRow label="Actualizaciones de envio" sublabel="Cuando tu pedido este en camino"
              value={prefs.shipping_updates} onChange={v => handleToggle('shipping_updates', v)} />
            <ToggleRow label="Pedido entregado"
              value={prefs.order_delivered} onChange={v => handleToggle('order_delivered', v)} />
            <ToggleRow label="Solicitudes de resena"
              value={prefs.review_requests} onChange={v => handleToggle('review_requests', v)} />
          </div>

          {/* B2B */}
          {isProducer && (
            <>
              <SectionLabel>B2B</SectionLabel>
              <div className="bg-white border-t border-stone-200">
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
          <div className="bg-white border-t border-stone-200">
            <ToggleRow label="Novedades de Hispaloshop" sublabel="Nuevas funcionalidades y anuncios"
              value={prefs.platform_news} onChange={v => handleToggle('platform_news', v)} />
            <ToggleRow label="Emails de marketing" sublabel="Ofertas y descuentos especiales"
              value={prefs.marketing_emails} onChange={v => handleToggle('marketing_emails', v)} />
          </div>
        </div>
      )}
    </div>
  );
}
