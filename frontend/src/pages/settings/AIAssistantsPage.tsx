// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Crown, Loader2, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../../utils/analytics';

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-stone-950' : 'bg-stone-300'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function SettingRow({ label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="min-w-0 mr-4">
        <p className="text-sm font-medium text-stone-950">{label}</p>
        {description && <p className="text-xs text-stone-500 mt-0.5">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function UpgradeBadge({ plan }) {
  return (
    <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
      Requiere {plan}
    </span>
  );
}

export default function AIAssistantsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const userPlan = (user?.subscription?.plan || 'FREE').toUpperCase();
  const hasPro = userPlan === 'PRO' || userPlan === 'ELITE';
  const hasElite = userPlan === 'ELITE';
  const isProducer = user?.role === 'producer' || user?.role === 'importer';

  useEffect(() => {
    apiClient.get('/ai/preferences')
      .then(setPrefs)
      .catch(() => setPrefs({ david: {}, rebeca: {}, pedro: {}, privacy: {} }))
      .finally(() => setLoading(false));
  }, []);

  const updatePref = async (section, key, value) => {
    const updated = { ...prefs, [section]: { ...(prefs?.[section] || {}), [key]: value } };
    setPrefs(updated);
    try {
      await apiClient.put('/ai/preferences', { [section]: { [key]: value } });
      trackEvent('ai_settings_changed', { assistant: section, setting: key, value });
    } catch {
      toast.error('Error al guardar');
    }
  };

  const deleteHistory = async (assistant) => {
    if (!window.confirm(`Borrar todo el historial de ${assistant === 'david' ? 'David' : assistant === 'rebeca' ? 'Rebeca' : 'Pedro'} AI?`)) return;
    setDeleting(assistant);
    try {
      await apiClient.delete(`/ai/${assistant}/history`);
      trackEvent('ai_history_deleted', { assistant });
      toast.success('Historial borrado');
    } catch {
      toast.error('Error');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-stone-500" />
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-950">Asistentes IA</h1>
        <p className="text-sm text-stone-500 mt-1">Configura tus asistentes de inteligencia artificial</p>
      </div>

      {/* David AI */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-[#0c0a09] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-stone-950">David AI</h2>
          <span className="text-[10px] text-stone-400">Todos los usuarios</span>
        </div>
        <div className="divide-y divide-stone-100">
          <SettingRow label="Flotante activo" description="Muestra el boton flotante de David" checked={prefs?.david?.floating_active !== false} onChange={(v) => updatePref('david', 'floating_active', v)} />
          <SettingRow label="Sugerencias proactivas" description="David puede enviarte mensajes con recomendaciones" checked={prefs?.david?.proactive !== false} onChange={(v) => updatePref('david', 'proactive', v)} />
        </div>
        <button onClick={() => deleteHistory('david')} disabled={deleting === 'david'} className="mt-3 flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-950 transition-colors">
          {deleting === 'david' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          Borrar historial de conversacion
        </button>
      </div>

      {/* Rebeca AI */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-stone-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-stone-950">Rebeca AI</h2>
          {hasPro ? <span className="text-[10px] text-stone-400">PRO+</span> : <UpgradeBadge plan="PRO" />}
        </div>
        {hasPro && isProducer ? (
          <>
            <div className="divide-y divide-stone-100">
              <SettingRow label="Flotante activo" checked={prefs?.rebeca?.floating_active !== false} onChange={(v) => updatePref('rebeca', 'floating_active', v)} />
              <SettingRow label="Briefings diarios" checked={prefs?.rebeca?.briefings !== false} onChange={(v) => updatePref('rebeca', 'briefings', v)} />
              <SettingRow label="Alertas de stock bajo" checked={prefs?.rebeca?.alerts_stock !== false} onChange={(v) => updatePref('rebeca', 'alerts_stock', v)} />
              <SettingRow label="Alertas de resenas" checked={prefs?.rebeca?.alerts_reviews !== false} onChange={(v) => updatePref('rebeca', 'alerts_reviews', v)} />
            </div>
            <button onClick={() => deleteHistory('rebeca')} disabled={deleting === 'rebeca'} className="mt-3 flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-950 transition-colors">
              {deleting === 'rebeca' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Borrar historial
            </button>
          </>
        ) : (
          <p className="text-sm text-stone-500">Actualiza a PRO para acceder a Rebeca, tu asesora comercial.</p>
        )}
      </div>

      {/* Pedro AI */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-stone-400 flex items-center justify-center">
            <Crown className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-stone-950">Pedro AI</h2>
          {hasElite ? <span className="text-[10px] text-stone-400">ELITE</span> : <UpgradeBadge plan="ELITE" />}
        </div>
        {hasElite && isProducer ? (
          <>
            <div className="divide-y divide-stone-100">
              <SettingRow label="Boton visible" description="Muestra el acceso rapido a Pedro en el stack flotante" checked={prefs?.pedro?.button_visible !== false} onChange={(v) => updatePref('pedro', 'button_visible', v)} />
            </div>
            <button onClick={() => deleteHistory('pedro')} disabled={deleting === 'pedro'} className="mt-3 flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-950 transition-colors">
              {deleting === 'pedro' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Borrar historial
            </button>
          </>
        ) : (
          <p className="text-sm text-stone-500">Actualiza a ELITE para acceder a Pedro, tu agente comercial internacional.</p>
        )}
      </div>

      {/* Privacy */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <h2 className="text-sm font-semibold text-stone-950 mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" /> Privacidad
        </h2>
        <div className="divide-y divide-stone-100">
          <SettingRow label="Usar mis datos para personalizacion" description="Permite a las IAs usar tu historial para mejorar las respuestas" checked={prefs?.privacy?.use_data_for_personalization !== false} onChange={(v) => updatePref('privacy', 'use_data_for_personalization', v)} />
        </div>
      </div>
    </div>
  );
}
