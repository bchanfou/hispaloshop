import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { SACard, SAPageHeader, SAInput, SASelect, SAButton } from '../../components/super-admin/SAUI';
import { Loader2, AlertTriangle, Play } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminSupport() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('global');
  const [items, setItems] = useState([]);
  const [escalated, setEscalated] = useState([]);
  const [breaches, setBreaches] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [filters, setFilters] = useState({ country_code: '', status: '', priority: '' });
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const loadGlobal = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const data = await apiClient.get(`/super-admin/support/tickets/global?${params.toString()}`);
      setItems(data?.items || []);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadEscalated = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/super-admin/support/tickets/escalated');
      setEscalated(data?.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/super-admin/support/metrics/global?period=30d&group_by=country');
      setMetrics(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBreaches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/super-admin/support/sla-breaches?period=30d');
      setBreaches(data?.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'global') loadGlobal();
    else if (tab === 'escalated') loadEscalated();
    else if (tab === 'metrics') loadMetrics();
    else if (tab === 'breaches') loadBreaches();
  }, [tab, loadGlobal, loadEscalated, loadMetrics, loadBreaches]);

  const runSlaMonitor = async () => {
    setRunning(true);
    try {
      const r = await apiClient.post('/super-admin/support/sla-monitor/run');
      toast.success(`Breaches: ${r.breached_first_response} · Auto-closed: ${r.auto_closed}`);
      if (tab === 'breaches') await loadBreaches();
    } catch (err) {
      toast.error(err?.message || 'Error');
    } finally {
      setRunning(false);
    }
  };

  const TABS = [
    { value: 'global', label: t('superAdmin.support.tabGlobal', 'Tickets globales') },
    { value: 'escalated', label: t('superAdmin.support.tabEscalated', 'Escalados') },
    { value: 'metrics', label: t('superAdmin.support.tabMetrics', 'Métricas globales') },
    { value: 'breaches', label: t('superAdmin.support.tabBreaches', 'SLA breaches') },
  ];

  return (
    <div className="space-y-6">
      <SAPageHeader
        title={t('superAdmin.support.title', 'Soporte global')}
        subtitle={t('superAdmin.support.subtitle', 'Tickets cross-country, escalaciones, métricas y SLA breaches.')}
        right={<SAButton variant="secondary" onClick={runSlaMonitor} disabled={running}>{running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}{t('superAdmin.support.runSla', 'SLA monitor')}</SAButton>}
      />

      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map((tb) => (
          <button
            key={tb.value}
            onClick={() => setTab(tb.value)}
            className={`px-4 py-2 rounded-xl text-sm transition-colors ${
              tab === tb.value ? 'bg-white text-stone-950' : 'bg-white/[0.06] text-white/70 border border-white/[0.12] hover:bg-white/[0.12]'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-white/40 animate-spin" /></div>
      ) : tab === 'global' ? (
        <>
          <SACard className="p-4 flex items-center gap-2 flex-wrap">
            <SAInput value={filters.country_code} onChange={(v) => setFilters({ ...filters, country_code: v })} placeholder="País (ES, KR, US)" className="w-32" />
            <SASelect value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} options={[
              { value: '', label: 'Estado: todos' },
              { value: 'awaiting_admin', label: 'awaiting_admin' },
              { value: 'in_progress', label: 'in_progress' },
              { value: 'resolved', label: 'resolved' },
              { value: 'closed', label: 'closed' },
              { value: 'escalated', label: 'escalated' },
            ]} />
            <SASelect value={filters.priority} onChange={(v) => setFilters({ ...filters, priority: v })} options={[
              { value: '', label: 'Prioridad: todas' },
              { value: 'critical', label: 'critical' },
              { value: 'high', label: 'high' },
              { value: 'normal', label: 'normal' },
              { value: 'low', label: 'low' },
            ]} />
          </SACard>
          <SACard className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-white/50 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Ticket</th>
                  <th className="text-left px-4 py-3">País</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Prioridad</th>
                  <th className="text-left px-4 py-3">Asignado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {items.map((t) => (
                  <tr key={t.ticket_id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="text-xs text-white/40 font-mono">{t.ticket_number}</p>
                      <p className="text-white truncate max-w-md">{t.subject}</p>
                    </td>
                    <td className="px-4 py-3 text-white/80">{t.country_code}</td>
                    <td className="px-4 py-3 text-white/80">{t.status}</td>
                    <td className="px-4 py-3 text-white/80">{t.priority}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">{(t.assigned_admin_id || '—').slice(-8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SACard>
        </>
      ) : tab === 'escalated' ? (
        <SACard className="overflow-hidden">
          {escalated.length === 0 ? (
            <p className="p-8 text-center text-sm text-white/40">{t('superAdmin.support.noEscalated', 'Sin escalados.')}</p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {escalated.map((tk) => (
                <div key={tk.ticket_id} className="p-5 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-1" />
                  <div className="flex-1">
                    <p className="text-xs text-white/40 font-mono">{tk.ticket_number}</p>
                    <p className="text-white">{tk.subject}</p>
                    <p className="text-xs text-white/60 mt-1">{tk.country_code} · {tk.priority}</p>
                    {tk.escalation_reason && <p className="text-xs text-amber-200 mt-2 italic">"{tk.escalation_reason}"</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SACard>
      ) : tab === 'metrics' ? (
        metrics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SACard className="p-5">
                <p className="text-xs text-white/40 uppercase">Open</p>
                <p className="text-3xl font-semibold text-white mt-2">{metrics.open_count}</p>
              </SACard>
              <SACard className="p-5">
                <p className="text-xs text-white/40 uppercase">SLA breaches</p>
                <p className="text-3xl font-semibold text-white mt-2">{metrics.sla_breaches}</p>
              </SACard>
              <SACard className="p-5">
                <p className="text-xs text-white/40 uppercase">CSAT promedio</p>
                <p className="text-3xl font-semibold text-white mt-2">{metrics.csat_avg ?? '—'} <span className="text-sm text-white/40">/ 5</span></p>
              </SACard>
            </div>
            <SACard className="p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Ranking por país</h3>
              <table className="w-full text-sm">
                <thead className="text-white/40 text-xs uppercase">
                  <tr><th className="text-left pb-2">País</th><th className="text-right pb-2">Tickets</th><th className="text-right pb-2">Resueltos</th></tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {(metrics.ranking || []).map((r) => (
                    <tr key={r._id || 'none'}>
                      <td className="py-2 text-white">{r._id || '—'}</td>
                      <td className="py-2 text-right text-white/80">{r.tickets}</td>
                      <td className="py-2 text-right text-white/80">{r.resolved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SACard>
          </>
        )
      ) : (
        <SACard className="overflow-hidden">
          {breaches.length === 0 ? (
            <p className="p-8 text-center text-sm text-white/40">{t('superAdmin.support.noBreaches', 'Sin breaches recientes.')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-white/50 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Ticket</th>
                  <th className="text-left px-4 py-3">País</th>
                  <th className="text-left px-4 py-3">Asignado</th>
                  <th className="text-left px-4 py-3">SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {breaches.map((b) => (
                  <tr key={b.ticket_id}>
                    <td className="px-4 py-3">
                      <p className="text-xs text-white/40 font-mono">{b.ticket_number}</p>
                      <p className="text-white">{b.subject}</p>
                    </td>
                    <td className="px-4 py-3 text-white/80">{b.country_code}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">{(b.assigned_admin_id || '—').slice(-8)}</td>
                    <td className="px-4 py-3 text-red-300">{b.sla_first_response_met === false ? 'first_response' : 'resolution'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SACard>
      )}
    </div>
  );
}
