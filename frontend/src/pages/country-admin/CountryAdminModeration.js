import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { toast } from 'sonner';
import { Loader2, Flag, AlertTriangle, Check, X, Eye, EyeOff, ShieldAlert, Ban } from 'lucide-react';

const PRIORITY_BADGE = {
  5: 'bg-red-500/15 text-red-700 border-red-500/40',
  4: 'bg-amber-500/15 text-amber-700 border-amber-500/40',
  3: 'bg-stone-200 text-stone-700',
  2: 'bg-stone-100 text-stone-600',
  1: 'bg-stone-100 text-stone-500',
};

const ACTION_BUTTONS = [
  { type: 'dismiss', label: 'Dismiss', icon: X, variant: 'secondary' },
  { type: 'warning', label: 'Warning', icon: AlertTriangle, variant: 'secondary' },
  { type: 'hide', label: 'Hide', icon: EyeOff, variant: 'secondary' },
  { type: 'remove', label: 'Remove', icon: X, variant: 'danger' },
  { type: 'restrict_features', label: 'Restrict 7d', icon: ShieldAlert, variant: 'secondary' },
  { type: 'suspend', label: 'Suspend 14d', icon: Ban, variant: 'danger' },
  { type: 'shadow_ban', label: 'Shadow ban', icon: Eye, variant: 'danger' },
  { type: 'ban', label: 'Ban', icon: Ban, variant: 'danger' },
];

export default function CountryAdminModeration() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('queue');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState(null); // {type, duration_days?}
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [metrics, setMetrics] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = tab === 'auto-flagged'
        ? '/country-admin/moderation/queue/auto-flagged'
        : '/country-admin/moderation/queue?status=pending';
      const data = await apiClient.get(url);
      setItems(data?.items || []);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    apiClient.get('/country-admin/moderation/metrics?period=30d').then(setMetrics).catch(() => {});
  }, []);

  const openReport = async (rep) => {
    try {
      const data = await apiClient.get(`/country-admin/moderation/reports/${rep.report_id}`);
      setSelected(data);
    } catch {
      toast.error(t('moderation.loadError', 'No se pudo cargar el report'));
    }
  };

  const submitAction = async () => {
    if (!selected || !action) return;
    if (reason.trim().length < 10) {
      toast.error(t('moderation.reasonMin10', 'Razón mínimo 10 caracteres'));
      return;
    }
    setSubmitting(true);
    try {
      const url = action.type === 'dismiss'
        ? `/country-admin/moderation/reports/${selected.report.report_id}/dismiss`
        : `/country-admin/moderation/reports/${selected.report.report_id}/resolve`;
      const body = action.type === 'dismiss'
        ? { reason: reason.trim() }
        : {
            action_type: action.type,
            reason: reason.trim(),
            duration_days: action.duration_days,
            notify_reporter: true,
          };
      await apiClient.post(url, body);
      toast.success(t('moderation.resolved', 'Acción aplicada'));
      setSelected(null); setAction(null); setReason('');
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const TABS = [
    { value: 'queue', label: t('moderation.tabQueue', 'Cola pendiente') },
    { value: 'auto-flagged', label: t('moderation.tabAutoFlagged', 'Auto-flagged') },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-stone-950 tracking-tight">{t('moderation.title', 'Moderación')}</h1>
        <p className="text-sm text-stone-500 mt-1">{t('moderation.subtitle', 'Reports de tu país y contenido auto-flagged.')}</p>
      </header>

      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-stone-200 rounded-2xl p-4">
            <p className="text-xs text-stone-500">{t('moderation.pending', 'Pendientes')}</p>
            <p className="text-2xl font-semibold text-stone-950">{metrics.pending}</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4">
            <p className="text-xs text-stone-500">{t('moderation.autoFlagged', 'Auto-flagged')}</p>
            <p className="text-2xl font-semibold text-stone-950">{metrics.auto_flagged}</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4">
            <p className="text-xs text-stone-500">{t('moderation.resolved30d', 'Resueltos 30d')}</p>
            <p className="text-2xl font-semibold text-stone-950">{metrics.resolved}</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4">
            <p className="text-xs text-stone-500">{t('moderation.dismissed30d', 'Dismissed 30d')}</p>
            <p className="text-2xl font-semibold text-stone-950">{metrics.dismissed}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {TABS.map((tb) => (
          <button
            key={tb.value}
            onClick={() => setTab(tb.value)}
            className={`px-4 py-2 rounded-xl text-sm transition-colors ${tab === tb.value ? 'bg-stone-950 text-white' : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'}`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-stone-400 animate-spin" /></div>
        ) : items.length === 0 ? (
          <p className="p-12 text-center text-sm text-stone-500">{t('moderation.empty', 'Sin reports en esta cola.')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">P</th>
                <th className="text-left px-4 py-3">{t('moderation.contentType', 'Tipo')}</th>
                <th className="text-left px-4 py-3">{t('moderation.reasonCol', 'Razón')}</th>
                <th className="text-left px-4 py-3">{t('moderation.reporter', 'Reporter')}</th>
                <th className="text-left px-4 py-3">{t('common.date', 'Fecha')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((r) => (
                <tr key={r.report_id} className="hover:bg-stone-50 cursor-pointer" onClick={() => openReport(r)}>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full border ${PRIORITY_BADGE[r.priority] || PRIORITY_BADGE[1]}`}>P{r.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-stone-950 capitalize">{r.content_type}</td>
                  <td className="px-4 py-3 text-stone-700">{t(`moderation.reasons.${r.reason}`, r.reason)}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs">{(r.reporter_user_id || '').slice(-8)}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => { if (!action) setSelected(null); }}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-stone-200">
              <div className="flex items-center gap-2 mb-2">
                <Flag className="w-4 h-4 text-stone-500" />
                <p className="text-xs text-stone-500 font-mono">{selected.report.report_id}</p>
              </div>
              <h3 className="text-lg font-semibold text-stone-950 capitalize">
                {selected.report.content_type} · {t(`moderation.reasons.${selected.report.reason}`, selected.report.reason)}
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                {t('moderation.reporter', 'Reporter')}: {selected.report.reporter_user_id} ·{' '}
                {t('moderation.author', 'Autor')}: {selected.report.content_author_id} ·{' '}
                {selected.report.content_country_code}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {selected.report.description && (
                <div>
                  <p className="text-xs text-stone-500 mb-1">{t('moderation.descriptionLabel', 'Descripción')}</p>
                  <p className="text-sm text-stone-700 bg-stone-50 rounded-xl p-3">{selected.report.description}</p>
                </div>
              )}
              {selected.author_state && (
                <div className="bg-stone-50 rounded-xl p-3">
                  <p className="text-xs text-stone-500 mb-2">{t('moderation.authorHistory', 'Historial del autor')}</p>
                  <p className="text-xs text-stone-700">
                    Warnings 30d: {selected.author_state.warnings_last_30d || 0} ·
                    {selected.author_state.is_banned ? ' baneado' : ''}
                    {selected.author_state.is_shadow_banned ? ' shadow' : ''}
                  </p>
                  <p className="text-xs text-stone-500 mt-1">{(selected.author_actions || []).length} acciones previas</p>
                </div>
              )}

              {!action ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {ACTION_BUTTONS.map((b) => (
                    <button
                      key={b.type}
                      onClick={() => setAction({ type: b.type, duration_days: b.type === 'restrict_features' ? 7 : b.type === 'suspend' ? 14 : undefined })}
                      className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                        b.variant === 'danger'
                          ? 'bg-stone-950 text-white hover:bg-stone-800'
                          : 'border border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <b.icon className="w-4 h-4" /> {b.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-stone-950">
                    {t('moderation.actionPicked', 'Acción')}: {action.type}
                  </p>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder={t('moderation.reasonPh', 'Razón de la decisión...')}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setAction(null); setReason(''); }} className="px-4 py-2 rounded-xl border border-stone-200 text-sm">{t('common.cancel', 'Cancelar')}</button>
                    <button
                      onClick={submitAction}
                      disabled={submitting || reason.trim().length < 10}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-950 text-white text-sm disabled:opacity-40"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      {t('common.confirm', 'Confirmar')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
