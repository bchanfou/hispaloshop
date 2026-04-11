import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { SACard, SAPageHeader, SAButton } from '../../components/super-admin/SAUI';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminExchangeRates() {
  const { t } = useTranslation();
  const [rates, setRates] = useState({});
  const [diff, setDiff] = useState({});
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // Reuse the overview endpoint to get a quick snapshot of currencies — the
      // backend doesn't expose a dedicated /rates GET, so we derive what we
      // can from the public service.
      const data = await apiClient.get('/config/exchange-rates').catch(() => null);
      setRates(data?.rates || {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const reconcile = async () => {
    setReconciling(true);
    try {
      const result = await apiClient.post('/super-admin/system/exchange-rates/reconcile');
      setDiff(result?.diff || {});
      toast.success(t('superAdmin.rates.reconciled', 'Tasas reconciliadas con ECB'));
      await load();
    } catch (err) {
      toast.error(err?.message || t('superAdmin.rates.error', 'Error reconciliando'));
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="space-y-6">
      <SAPageHeader
        title={t('superAdmin.rates.title', 'Exchange rates')}
        subtitle={t('superAdmin.rates.subtitle', 'Tasas ECB usadas por el ledger y conversión a USD.')}
        right={
          <SAButton variant="primary" onClick={reconcile} disabled={reconciling}>
            {reconciling ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {t('superAdmin.rates.reconcileNow', 'Reconciliar ahora')}
          </SAButton>
        }
      />

      {Object.keys(diff).length > 0 && (
        <SACard className="p-5">
          <h3 className="text-sm font-semibold text-white mb-3">{t('superAdmin.rates.diffTitle', 'Cambios en la última reconciliación')}</h3>
          <div className="space-y-1 text-xs text-white/70">
            {Object.entries(diff).map(([cur, vals]) => (
              <div key={cur} className="flex items-center gap-2 font-mono">
                <span className="text-white">{cur}</span>
                <span className="text-white/40">{vals.before ?? '—'}</span>
                <span>→</span>
                <span className="text-emerald-300">{vals.after ?? '—'}</span>
              </div>
            ))}
          </div>
        </SACard>
      )}

      <SACard className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-white/40 animate-spin" /></div>
        ) : Object.keys(rates).length === 0 ? (
          <p className="p-8 text-center text-sm text-white/40">{t('superAdmin.rates.empty', 'Sin datos. Reconcilia para descargar las tasas ECB.')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-white/50 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">{t('common.currency', 'Moneda')}</th>
                <th className="text-right px-4 py-3">{t('superAdmin.rates.toUsd', 'Rate → USD')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {Object.entries(rates).sort().map(([cur, rate]) => (
                <tr key={cur}>
                  <td className="px-4 py-2 text-white font-mono">{cur}</td>
                  <td className="px-4 py-2 text-right text-white/80 font-mono">{rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SACard>
    </div>
  );
}
