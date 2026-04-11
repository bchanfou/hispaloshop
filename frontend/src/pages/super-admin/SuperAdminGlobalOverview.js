import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { SACard, SAPageHeader, SAKpiCard } from '../../components/super-admin/SAUI';
import { TrendingUp, Globe, Users, ShieldCheck, RotateCcw, ShoppingBag, Zap, Activity, Loader2 } from 'lucide-react';

export default function SuperAdminGlobalOverview() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/super-admin/overview')
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-white/40 animate-spin" /></div>;
  if (!data) return <p className="text-white/60">{t('superAdmin.noData', 'Sin datos')}</p>;

  const k = data.kpis || {};
  const fmtUSD = (v) => `$${(v || 0).toLocaleString()}`;
  const dotColor = (row) => row.gmv_usd > 1000 ? 'bg-emerald-400' : row.gmv_usd > 0 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="space-y-6">
      <SAPageHeader
        title={t('superAdmin.overview.title', 'Visión global')}
        subtitle={t('superAdmin.overview.subtitle', 'Marketplace multi-país en un vistazo.')}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SAKpiCard icon={TrendingUp} label={t('superAdmin.kpi.gmvMonth', 'GMV mes')} value={fmtUSD(k.total_gmv_usd_month)} />
        <SAKpiCard icon={ShoppingBag} label={t('superAdmin.kpi.orders', 'Pedidos mes')} value={k.total_orders_month ?? 0} />
        <SAKpiCard icon={Users} label={t('superAdmin.kpi.sellers', 'Sellers activos')} value={k.total_active_sellers ?? 0} />
        <SAKpiCard icon={Globe} label={t('superAdmin.kpi.countries', 'Países activos')} value={k.total_active_countries ?? 0} />
        <SAKpiCard icon={ShieldCheck} label={t('superAdmin.kpi.pendingVerifGlobal', 'Verifs pendientes')} value={k.total_pending_verifications_global ?? 0} />
        <SAKpiCard icon={RotateCcw} label={t('superAdmin.kpi.refundRate', 'Refund rate')} value={`${k.refund_rate_global ?? 0}%`} />
        <SAKpiCard icon={Activity} label={t('superAdmin.kpi.health', 'Health')} value={data.system_health_summary?.kill_switches_active?.length ? 'WARN' : 'OK'} sub={data.system_health_summary?.kill_switches_active?.join(', ') || ''} />
        <SAKpiCard icon={Zap} label={t('superAdmin.kpi.exchange', 'Exchange rates')} value={data.system_health_summary?.exchange_rates_have_data ? 'OK' : 'WARN'} />
      </div>

      <SACard className="p-6">
        <h2 className="text-base font-semibold text-white mb-4">{t('superAdmin.topCountriesGmv', 'Top 5 países por GMV')}</h2>
        <table className="w-full text-sm">
          <thead className="text-white/40 text-xs uppercase">
            <tr><th className="text-left pb-3">{t('common.country', 'País')}</th><th className="text-right pb-3">GMV (USD)</th><th className="text-right pb-3">{t('common.orders', 'Pedidos')}</th></tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {(data.top_5_countries_by_gmv || []).map((row) => (
              <tr key={row.country_code}>
                <td className="py-3 text-white flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dotColor(row)}`} />
                  {row.country_code}
                </td>
                <td className="py-3 text-right text-white">{fmtUSD(row.gmv_usd)}</td>
                <td className="py-3 text-right text-white/60">{row.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SACard>
    </div>
  );
}
