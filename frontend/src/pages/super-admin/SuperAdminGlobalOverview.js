import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { SACard, SAPageHeader, SAKpiCard } from '../../components/super-admin/SAUI';
import {
  TrendingUp, Globe, Users, ShieldCheck, RotateCcw, ShoppingBag,
  Zap, Activity, HeadphonesIcon, Flag, Loader2,
} from 'lucide-react';

export default function SuperAdminGlobalOverview() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [support, setSupport] = useState(null);
  const [moderation, setModeration] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // F-5 (3.6.5): also fetch support + moderation global metrics for KPI cards.
    Promise.allSettled([
      apiClient.get('/super-admin/overview'),
      apiClient.get('/super-admin/support/metrics/global?period=30d&group_by=country'),
      apiClient.get('/super-admin/moderation/metrics/global?period=30d'),
    ]).then(([ov, sup, mod]) => {
      if (ov.status === 'fulfilled') setData(ov.value);
      if (sup.status === 'fulfilled') setSupport(sup.value);
      if (mod.status === 'fulfilled') setModeration(mod.value);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-white/40 animate-spin" aria-label={t('common.loading', 'Cargando')} /></div>;
  if (!data) return <p className="text-white/60">{t('superAdmin.noData', 'Sin datos')}</p>;

  const k = data.kpis || {};
  const fmtUSD = (v) => `$${(v || 0).toLocaleString()}`;
  // Stone-only indicator dot (3.6.5: no emerald/amber/red on overview table).
  const dotColor = (row) => row.gmv_usd > 1000 ? 'bg-white' : row.gmv_usd > 0 ? 'bg-white/60' : 'bg-white/20';

  // F-5: support KPI — top 3 countries by open tickets
  const supportTop3 = (support?.ranking || [])
    .filter((r) => r._id)
    .slice(0, 3)
    .map((r) => `${r._id} (${r.tickets})`)
    .join(', ');

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

        {/* F-5: Soporte global — open tickets + SLA breaches + top 3 countries */}
        <SAKpiCard
          icon={HeadphonesIcon}
          label={t('superAdmin.kpi.supportGlobal', 'Soporte global')}
          value={support ? `${support.open_count ?? 0} · ${support.sla_breaches ?? 0} SLA` : '—'}
          sub={supportTop3 || t('superAdmin.kpi.supportNoData', 'Top países de tickets')}
        />

        {/* F-5 bonus: Moderación global — pending appeals + false positive rate */}
        <SAKpiCard
          icon={Flag}
          label={t('superAdmin.kpi.moderationGlobal', 'Moderación global')}
          value={moderation ? `${moderation.appeals_pending ?? 0} appeals` : '—'}
          sub={moderation ? `${t('superAdmin.kpi.fpRate', 'FP rate')}: ${moderation.false_positive_rate_pct ?? 0}%` : ''}
        />
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
