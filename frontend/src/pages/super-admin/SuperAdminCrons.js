import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { SACard, SAPageHeader, SAButton } from '../../components/super-admin/SAUI';
import { Play, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminCrons() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/super-admin/system/crons');
      setItems(data?.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const run = async (name) => {
    if (!window.confirm(t('superAdmin.crons.confirm', '¿Ejecutar este cron ahora?'))) return;
    setRunning(name);
    try {
      const result = await apiClient.post(`/super-admin/system/cron/${name}/run`);
      toast.success(`${name}: ${result?.result || 'ok'}`);
      await load();
    } catch (err) {
      toast.error(err?.message || t('superAdmin.crons.error', 'Error en cron'));
    } finally {
      setRunning(null);
    }
  };

  const StatusIcon = ({ status }) => {
    // Stone-only per 3.6.5 (contrast via brightness instead of colour).
    if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-white" />;
    if (status === 'failed') return <XCircle className="w-4 h-4 text-white/50" />;
    return <Clock className="w-4 h-4 text-white/40" />;
  };

  return (
    <div className="space-y-6">
      <SAPageHeader
        title={t('superAdmin.crons.title', 'Crons')}
        subtitle={t('superAdmin.crons.subtitle', 'Disparar manualmente tareas programadas.')}
      />

      <SACard className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-white/40 animate-spin" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-white/50 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">{t('common.name', 'Nombre')}</th>
                <th className="text-left px-4 py-3">{t('common.lastRun', 'Último run')}</th>
                <th className="text-left px-4 py-3">{t('common.status', 'Estado')}</th>
                <th className="text-right px-4 py-3">{t('common.actions', 'Acciones')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {items.map((it) => (
                <tr key={it.name}>
                  <td className="px-4 py-3 text-white font-mono text-xs">{it.name}</td>
                  <td className="px-4 py-3 text-white/60 text-xs">{it.last_run_at ? new Date(it.last_run_at).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-xs text-white/70">
                      <StatusIcon status={it.last_status} />
                      {it.last_status || 'never'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <SAButton variant="secondary" disabled={running === it.name} onClick={() => run(it.name)}>
                      {running === it.name ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      {t('common.runNow', 'Run now')}
                    </SAButton>
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
