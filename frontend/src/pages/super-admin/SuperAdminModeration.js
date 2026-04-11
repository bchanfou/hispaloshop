import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { SACard, SAPageHeader, SAButton } from '../../components/super-admin/SAUI';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminModeration() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('queue');
  const [queue, setQueue] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [appealDetail, setAppealDetail] = useState(null);
  const [decision, setDecision] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/super-admin/moderation/queue/global?limit=200');
      setQueue(data?.items || []);
    } finally { setLoading(false); }
  }, []);

  const loadAppeals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/super-admin/moderation/appeals/queue?status=pending');
      setAppeals(data?.items || []);
    } finally { setLoading(false); }
  }, []);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/super-admin/moderation/metrics/global?period=30d');
      setMetrics(data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'queue') loadQueue();
    else if (tab === 'appeals') loadAppeals();
    else if (tab === 'metrics') loadMetrics();
  }, [tab, loadQueue, loadAppeals, loadMetrics]);

  const openAppeal = async (appeal) => {
    try {
      const data = await apiClient.get(`/super-admin/moderation/appeals/${appeal.appeal_id}`);
      setAppealDetail(data);
      setDecision(''); setDecisionReason('');
    } catch {
      toast.error(t('moderation.loadError', 'No se pudo cargar el appeal'));
    }
  };

  const submitAppeal = async () => {
    if (!appealDetail || !decision) return;
    if (decisionReason.trim().length < 10) {
      toast.error(t('moderation.reasonMin10', 'Razón mínimo 10 caracteres'));
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/super-admin/moderation/appeals/${appealDetail.appeal.appeal_id}/resolve`, {
        decision,
        reason: decisionReason.trim(),
      });
      toast.success(t('moderation.appealResolved', 'Appeal resuelto'));
      setAppealDetail(null);
      await loadAppeals();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const TABS = [
    { value: 'queue', label: t('superAdmin.mod.tabQueue', 'Cola global') },
    { value: 'appeals', label: t('superAdmin.mod.tabAppeals', 'Appeals') },
    { value: 'metrics', label: t('superAdmin.mod.tabMetrics', 'Métricas') },
  ];

  return (
    <div className="space-y-6">
      <SAPageHeader
        title={t('superAdmin.mod.title', 'Moderación global')}
        subtitle={t('superAdmin.mod.subtitle', 'Reports cross-país, appeals y métricas globales.')}
      />

      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map((tb) => (
          <button
            key={tb.value}
            onClick={() => setTab(tb.value)}
            className={`px-4 py-2 rounded-xl text-sm transition-colors ${tab === tb.value ? 'bg-white text-stone-950' : 'bg-white/[0.06] text-white/70 border border-white/[0.12] hover:bg-white/[0.12]'}`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-white/40 animate-spin" /></div>
      ) : tab === 'queue' ? (
        <SACard className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-white/50 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">P</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">País</th>
                <th className="text-left px-4 py-3">Razón</th>
                <th className="text-left px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {queue.map((r) => (
                <tr key={r.report_id}>
                  <td className="px-4 py-3 text-white">P{r.priority}</td>
                  <td className="px-4 py-3 text-white/80 capitalize">{r.content_type}</td>
                  <td className="px-4 py-3 text-white/80">{r.content_country_code}</td>
                  <td className="px-4 py-3 text-white/80">{r.reason}</td>
                  <td className="px-4 py-3 text-white/60">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SACard>
      ) : tab === 'appeals' ? (
        <SACard className="overflow-hidden">
          {appeals.length === 0 ? (
            <p className="p-8 text-center text-sm text-white/40">{t('superAdmin.mod.noAppeals', 'No hay appeals pendientes.')}</p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {appeals.map((a) => (
                <button
                  key={a.appeal_id}
                  onClick={() => openAppeal(a)}
                  className="w-full text-left p-5 hover:bg-white/[0.02] flex items-start gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-1" />
                  <div className="flex-1">
                    <p className="text-xs text-white/40 font-mono">{a.appeal_id}</p>
                    <p className="text-white">{a.action_type}</p>
                    <p className="text-xs text-white/60 mt-1 italic">"{a.appeal_reason?.slice(0, 120)}"</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </SACard>
      ) : metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <SACard className="p-5">
            <p className="text-xs text-white/40 uppercase">Total reports</p>
            <p className="text-3xl font-semibold text-white mt-2">{metrics.total_reports}</p>
          </SACard>
          <SACard className="p-5">
            <p className="text-xs text-white/40 uppercase">Total actions</p>
            <p className="text-3xl font-semibold text-white mt-2">{metrics.total_actions}</p>
          </SACard>
          <SACard className="p-5">
            <p className="text-xs text-white/40 uppercase">Auto actions</p>
            <p className="text-3xl font-semibold text-white mt-2">{metrics.auto_actions}</p>
          </SACard>
          <SACard className="p-5">
            <p className="text-xs text-white/40 uppercase">FP rate</p>
            <p className="text-3xl font-semibold text-white mt-2">{metrics.false_positive_rate_pct}%</p>
          </SACard>
          <SACard className="p-5">
            <p className="text-xs text-white/40 uppercase">Appeals total</p>
            <p className="text-3xl font-semibold text-white mt-2">{metrics.appeals_total}</p>
          </SACard>
          <SACard className="p-5">
            <p className="text-xs text-white/40 uppercase">Appeals pending</p>
            <p className="text-3xl font-semibold text-white mt-2">{metrics.appeals_pending}</p>
          </SACard>
        </div>
      )}

      {/* Appeal review modal */}
      {appealDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setAppealDetail(null)}>
          <div className="bg-[#1A1D27] border border-white/[0.12] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/[0.08]">
              <p className="text-xs text-white/40 font-mono">{appealDetail.appeal.appeal_id}</p>
              <h3 className="text-lg font-semibold text-white mt-1">
                {t('superAdmin.mod.appealReview', 'Revisar appeal')}
              </h3>
              <p className="text-xs text-white/60 mt-2">
                {t('superAdmin.mod.originalAction', 'Acción original')}: {appealDetail.action?.action_type} ·{' '}
                {appealDetail.action?.actor_role}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-white/40 uppercase mb-1">{t('superAdmin.mod.userReason', 'Razón del usuario')}</p>
                <p className="text-sm text-white/80 bg-white/[0.04] rounded-xl p-3">{appealDetail.appeal.appeal_reason}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase mb-1">{t('superAdmin.mod.adminReason', 'Razón del admin original')}</p>
                <p className="text-sm text-white/80 bg-white/[0.04] rounded-xl p-3">{appealDetail.action?.reason}</p>
              </div>
              <div className="flex items-center gap-2">
                {['confirm', 'revert', 'modify'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDecision(d)}
                    className={`px-4 py-2 rounded-xl text-sm ${decision === d ? 'bg-white text-stone-950' : 'border border-white/[0.12] text-white/80'}`}
                  >
                    {t(`superAdmin.mod.${d}`, d)}
                  </button>
                ))}
              </div>
              <textarea
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                rows={3}
                placeholder={t('superAdmin.mod.decisionReasonPh', 'Razón de la decisión...')}
                className="w-full bg-[#0c0a09] border border-white/[0.12] rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="p-6 border-t border-white/[0.08] flex justify-end gap-2">
              <SAButton variant="secondary" onClick={() => setAppealDetail(null)}>{t('common.cancel', 'Cancelar')}</SAButton>
              <SAButton onClick={submitAppeal} disabled={!decision || decisionReason.trim().length < 10 || submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('common.confirm', 'Confirmar')}
              </SAButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
