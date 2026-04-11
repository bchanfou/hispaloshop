import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function CountryAdminSettings() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currency, setCurrency] = useState('EUR');
  const [weeklyGoal, setWeeklyGoal] = useState('');
  const [freeThreshold, setFreeThreshold] = useState('');
  const [defaultFee, setDefaultFee] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await apiClient.get('/country-admin/settings');
        setCurrency(data?.currency || 'EUR');
        setWeeklyGoal(((data?.weekly_goal_cents || 0) / 100).toString());
        const ds = data?.default_shipping || {};
        setFreeThreshold(((ds.free_shipping_threshold_cents || 0) / 100).toString());
        setDefaultFee(((ds.default_shipping_fee_cents || 0) / 100).toString());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveWeeklyGoal = async () => {
    setSaving(true);
    try {
      const cents = Math.round(parseFloat(weeklyGoal || '0') * 100);
      await apiClient.put('/country-admin/settings/weekly-goal', { weekly_goal_cents: cents });
      toast.success(t('countryAdmin.settings.savedGoal', 'Objetivo guardado'));
    } catch (err) {
      toast.error(err?.message || t('countryAdmin.actionError', 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  const saveShipping = async () => {
    setSaving(true);
    try {
      await apiClient.put('/country-admin/settings/default-shipping', {
        free_shipping_threshold_cents: Math.round(parseFloat(freeThreshold || '0') * 100),
        default_shipping_fee_cents: Math.round(parseFloat(defaultFee || '0') * 100),
      });
      toast.success(t('countryAdmin.settings.savedShipping', 'Envío guardado'));
    } catch (err) {
      toast.error(err?.message || t('countryAdmin.actionError', 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-stone-400 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-semibold text-stone-950 tracking-tight">
          {t('countryAdmin.settings.title', 'Configuración')}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {t('countryAdmin.settings.subtitle', 'Defaults locales del marketplace.')}
        </p>
      </header>

      {/* Weekly goal */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-stone-950">
            {t('countryAdmin.settings.weeklyGoalTitle', 'Objetivo semanal de GMV')}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            {t('countryAdmin.settings.weeklyGoalHelp', 'Cuánto GMV en moneda local quieres alcanzar cada semana.')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={weeklyGoal}
            onChange={(e) => setWeeklyGoal(e.target.value)}
            min="0"
            step="100"
            className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-sm"
          />
          <span className="text-sm text-stone-500">{currency}</span>
          <button
            onClick={saveWeeklyGoal}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-950 text-white text-sm hover:bg-stone-800 disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('common.save', 'Guardar')}
          </button>
        </div>
      </div>

      {/* Default shipping */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-stone-950">
            {t('countryAdmin.settings.shippingTitle', 'Envío por defecto')}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            {t('countryAdmin.settings.shippingHelp', 'Sugerencias de envío para los nuevos sellers de tu país.')}
          </p>
        </div>
        <div>
          <label className="text-xs text-stone-500 block mb-1">
            {t('countryAdmin.settings.freeThreshold', 'Umbral de envío gratis')}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={freeThreshold}
              onChange={(e) => setFreeThreshold(e.target.value)}
              min="0"
              step="1"
              className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-sm"
            />
            <span className="text-sm text-stone-500">{currency}</span>
          </div>
        </div>
        <div>
          <label className="text-xs text-stone-500 block mb-1">
            {t('countryAdmin.settings.defaultFee', 'Coste de envío por defecto')}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={defaultFee}
              onChange={(e) => setDefaultFee(e.target.value)}
              min="0"
              step="0.5"
              className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-sm"
            />
            <span className="text-sm text-stone-500">{currency}</span>
          </div>
        </div>
        <button
          onClick={saveShipping}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-950 text-white text-sm hover:bg-stone-800 disabled:opacity-40"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('common.save', 'Guardar')}
        </button>
      </div>
    </div>
  );
}
