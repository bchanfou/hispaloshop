import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, AlertTriangle, Shield } from 'lucide-react';

export default function AccountRestrictionsPage() {
  const { t } = useTranslation();
  const [actions, setActions] = useState([]);
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appealing, setAppealing] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient.get('/moderation/me/state').catch(() => null),
      apiClient.get('/moderation/me/actions').catch(() => ({ items: [] })),
    ]).then(([s, a]) => {
      setState(s);
      setActions(a?.items || []);
      setLoading(false);
    });
  }, []);

  const submitAppeal = async () => {
    if (!appealing) return;
    if (reason.trim().length < 20) {
      toast.error(t('moderation.appealReasonMin', 'Razón mínimo 20 caracteres'));
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/moderation/appeals', {
        action_id: appealing.action_id,
        reason: reason.trim(),
      });
      toast.success(t('moderation.appealSent', 'Apelación enviada'));
      setAppealing(null);
      setReason('');
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Loader2 className="w-6 h-6 text-stone-400 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-stone-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-950 mb-4">
          <ArrowLeft className="w-4 h-4" /> {t('common.back', 'Volver')}
        </Link>

        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-stone-950">{t('moderation.restrictionsTitle', 'Estado de mi cuenta')}</h1>
          <p className="text-sm text-stone-500 mt-1">{t('moderation.restrictionsSubtitle', 'Acciones de moderación que afectan a tu cuenta.')}</p>
        </header>

        {state && (state.restrictions_active || state.suspended || state.is_banned) ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div className="text-sm text-stone-700">
                {state.is_banned && <p>{t('moderation.banned', 'Tu cuenta está baneada permanentemente.')}</p>}
                {state.suspended && <p>{t('moderation.suspended', 'Tu cuenta está suspendida hasta {{date}}.', { date: state.suspended_until ? new Date(state.suspended_until).toLocaleDateString() : '—' })}</p>}
                {state.restrictions_active && <p>{t('moderation.restricted', 'Tu cuenta tiene restricciones temporales hasta {{date}}.', { date: state.restrictions_expires_at ? new Date(state.restrictions_expires_at).toLocaleDateString() : '—' })}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-emerald-500" />
              <p className="text-sm text-stone-700">{t('moderation.allClear', 'Tu cuenta está en buen estado.')}</p>
            </div>
          </div>
        )}

        <h2 className="text-base font-semibold text-stone-950 mb-3">{t('moderation.actionsHistory', 'Historial de acciones')}</h2>
        {actions.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-sm text-stone-500">
            {t('moderation.noActions', 'Sin acciones registradas.')}
          </div>
        ) : (
          <div className="space-y-2">
            {actions.map((a) => (
              <div key={a.action_id} className="bg-white border border-stone-200 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-950 capitalize">{a.action_type.replace('_', ' ')}</p>
                    <p className="text-xs text-stone-500 mt-1">{a.reason}</p>
                    <p className="text-xs text-stone-400 mt-1">{new Date(a.applied_at).toLocaleString()}</p>
                  </div>
                  {!a.reverted && a.action_type !== 'dismiss' && a.action_type !== 'warning' && (
                    <button
                      onClick={() => { setAppealing(a); setReason(''); }}
                      className="text-xs text-stone-950 underline whitespace-nowrap"
                    >
                      {t('moderation.appeal', 'Apelar')}
                    </button>
                  )}
                  {a.reverted && (
                    <span className="text-xs text-emerald-600 whitespace-nowrap">{t('moderation.reverted', 'Revertido')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {appealing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setAppealing(null)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-stone-950">{t('moderation.appealTitle', 'Apelar acción')}</h3>
            <p className="text-xs text-stone-500">{appealing.action_type} · {appealing.reason}</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder={t('moderation.appealReasonPh', 'Explica por qué consideras que la decisión fue incorrecta (mínimo 20 caracteres)')}
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm"
            />
            <p className="text-xs text-stone-400">{reason.length} / 20</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAppealing(null)} className="px-4 py-2 rounded-xl border border-stone-200 text-sm">{t('common.cancel', 'Cancelar')}</button>
              <button
                onClick={submitAppeal}
                disabled={submitting || reason.trim().length < 20}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-950 text-white text-sm disabled:opacity-40"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('moderation.sendAppeal', 'Enviar apelación')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
