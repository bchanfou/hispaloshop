import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { SACard, SAPageHeader, SASelect, SAButton } from '../../components/super-admin/SAUI';
import { Loader2, Download } from 'lucide-react';

export default function SuperAdminCountriesComparison() {
  const { t } = useTranslation();
  const [metric, setMetric] = useState('gmv');
  const [period, setPeriod] = useState('30d');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get(`/super-admin/countries/comparison?metric=${metric}&period=${period}`);
      setItems(data?.items || []);
    } finally {
      setLoading(false);
    }
  }, [metric, period]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    const header = ['country_code', 'name', 'currency', 'gmv_local', 'gmv_usd', 'orders', 'sellers', 'refund_rate_pct', 'is_active'];
    const rows = items.map((r) => header.map((h) => r[h]).join(','));
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `countries_${period}_${metric}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <SAPageHeader
        title={t('superAdmin.comparison.title', 'Comparativa de países')}
        subtitle={t('superAdmin.comparison.subtitle', 'Métricas comparables entre todos los mercados activos.')}
        right={
          <div className="flex items-center gap-2">
            <SASelect value={metric} onChange={setMetric} options={[
              { value: 'gmv', label: t('superAdmin.metric.gmv', 'GMV') },
              { value: 'orders', label: t('superAdmin.metric.orders', 'Pedidos') },
              { value: 'sellers', label: t('superAdmin.metric.sellers', 'Sellers') },
              { value: 'refund_rate', label: t('superAdmin.metric.refundRate', 'Refund rate') },
            ]} />
            <SASelect value={period} onChange={setPeriod} options={[
              { value: '7d', label: '7d' },
              { value: '30d', label: '30d' },
              { value: '90d', label: '90d' },
            ]} />
            <SAButton variant="secondary" onClick={exportCsv}><Download className="w-4 h-4" />CSV</SAButton>
          </div>
        }
      />

      <SACard className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-white/40 animate-spin" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-white/50 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">{t('common.country', 'País')}</th>
                <th className="text-right px-4 py-3">GMV local</th>
                <th className="text-right px-4 py-3">GMV USD</th>
                <th className="text-right px-4 py-3">{t('common.orders', 'Pedidos')}</th>
                <th className="text-right px-4 py-3">Sellers</th>
                <th className="text-right px-4 py-3">Refund %</th>
                <th className="text-right px-4 py-3">{t('common.status', 'Estado')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {items.map((r) => (
                <tr key={r.country_code} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white">{r.flag} {r.name} <span className="text-white/40 text-xs">{r.country_code}</span></td>
                  <td className="px-4 py-3 text-right text-white">{r.gmv_local?.toLocaleString()} {r.currency}</td>
                  <td className="px-4 py-3 text-right text-white/80">${r.gmv_usd?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-white/80">{r.orders}</td>
                  <td className="px-4 py-3 text-right text-white/80">{r.sellers}</td>
                  <td className="px-4 py-3 text-right text-white/80">{r.refund_rate_pct}%</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${r.is_active ? 'bg-white/[0.10] text-white border-white/[0.20]' : 'bg-white/[0.04] text-white/40 border-white/[0.08]'}`}>
                      {r.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SACard>
    </div>
  );
}
