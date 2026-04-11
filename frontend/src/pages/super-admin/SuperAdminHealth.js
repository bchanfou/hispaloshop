import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { SACard, SAPageHeader } from '../../components/super-admin/SAUI';
import { CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react';

const CHECKS = [
  { key: 'mongo', label: 'MongoDB', endpoint: '/super-admin/overview' }, // proxy: if overview works, mongo is up
  { key: 'exchange_rates', label: 'ECB exchange rates', endpoint: null },
  { key: 'kill_switches', label: 'Kill switches', endpoint: null },
];

export default function SuperAdminHealth() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/super-admin/overview')
      .then((d) => setData(d?.system_health_summary || {}))
      .catch(() => setData({}))
      .finally(() => setLoading(false));
  }, []);

  const StatusBadge = ({ ok, warn = false }) => {
    if (warn) return <span className="inline-flex items-center gap-1 text-xs text-amber-300"><AlertCircle className="w-3.5 h-3.5" /> warning</span>;
    if (ok) return <span className="inline-flex items-center gap-1 text-xs text-emerald-300"><CheckCircle2 className="w-3.5 h-3.5" /> ok</span>;
    return <span className="inline-flex items-center gap-1 text-xs text-red-300"><XCircle className="w-3.5 h-3.5" /> down</span>;
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-white/40 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <SAPageHeader
        title={t('superAdmin.health.title', 'Health')}
        subtitle={t('superAdmin.health.subtitle', 'Estado de servicios críticos.')}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SACard className="p-5">
          <p className="text-xs text-white/40 uppercase mb-2">MongoDB</p>
          <StatusBadge ok={data?.mongo === 'ok'} />
        </SACard>
        <SACard className="p-5">
          <p className="text-xs text-white/40 uppercase mb-2">Exchange rates (ECB)</p>
          <StatusBadge ok={data?.exchange_rates_have_data} warn={!data?.exchange_rates_have_data} />
          {!data?.exchange_rates_have_data && (
            <p className="text-xs text-white/50 mt-2">{t('superAdmin.health.exchangeWarn', 'Sin datos en BD. Reconciliar manualmente.')}</p>
          )}
        </SACard>
        <SACard className="p-5">
          <p className="text-xs text-white/40 uppercase mb-2">Kill switches</p>
          {data?.kill_switches_active?.length > 0 ? (
            <>
              <StatusBadge ok={false} warn={true} />
              <p className="text-xs text-amber-300 mt-2">Activos: {data.kill_switches_active.join(', ')}</p>
            </>
          ) : (
            <StatusBadge ok={true} />
          )}
        </SACard>
        <SACard className="p-5">
          <p className="text-xs text-white/40 uppercase mb-2">Stripe / FCM / Sentry</p>
          <p className="text-xs text-white/50">{t('superAdmin.health.thirdPartyNote', 'Verificar manualmente desde Infraestructura.')}</p>
        </SACard>
      </div>
    </div>
  );
}
