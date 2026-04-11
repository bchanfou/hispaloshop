import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { SACard, SAPageHeader, SAButton, SAInput } from '../../components/super-admin/SAUI';
import { AlertOctagon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function FounderConsole() {
  const { t } = useTranslation();
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ FREE: '', PRO: '', ELITE: '', hercules: '', atenea: '', zeus: '' });
  const [password, setPassword] = useState('');
  const [acknowledge, setAcknowledge] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [logoutReason, setLogoutReason] = useState('');

  useEffect(() => {
    apiClient.get('/super-admin/commission-rates')
      .then((d) => {
        setRates(d?.rates);
        const sp = d?.rates?.seller_plans || {};
        const it = d?.rates?.influencer_tiers || {};
        setDraft({
          FREE: sp.FREE ?? '',
          PRO: sp.PRO ?? '',
          ELITE: sp.ELITE ?? '',
          hercules: it.hercules ?? '',
          atenea: it.atenea ?? '',
          zeus: it.zeus ?? '',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const submitRates = async () => {
    if (!acknowledge) {
      toast.error(t('founder.mustAck', 'Debes aceptar el acknowledge'));
      return;
    }
    if (!password) {
      toast.error(t('founder.passwordRequired', 'Password founder requerida'));
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.put('/super-admin/commission-rates', {
        acknowledge_breaks_history: true,
        founder_password_confirm: password,
        rates: {
          seller_plans: { FREE: parseFloat(draft.FREE), PRO: parseFloat(draft.PRO), ELITE: parseFloat(draft.ELITE) },
          influencer_tiers: { hercules: parseFloat(draft.hercules), atenea: parseFloat(draft.atenea), zeus: parseFloat(draft.zeus) },
        },
        reason: 'Founder console manual change',
      });
      toast.success(t('founder.ratesUpdated', 'Comisiones actualizadas'));
      setPassword('');
    } catch (err) {
      toast.error(err?.message || t('founder.error', 'Error'));
    } finally {
      setSubmitting(false);
    }
  };

  const forceLogoutAll = async () => {
    if (logoutReason.trim().length < 30) {
      toast.error(t('founder.reasonMin30', 'Motivo mínimo 30 caracteres'));
      return;
    }
    if (!window.confirm(t('founder.confirmLogoutAll', 'Esto cerrará la sesión de TODOS los usuarios. ¿Seguro?'))) return;
    try {
      const r = await apiClient.post('/super-admin/founder/force-logout-all', { reason: logoutReason.trim() });
      toast.success(`${r?.deleted_sessions || 0} sesiones cerradas`);
      setLogoutReason('');
    } catch (err) {
      toast.error(err?.message || 'Error');
    }
  };

  const clearCache = async () => {
    if (!window.confirm(t('founder.confirmClearCache', 'Limpiar todos los caches en memoria del backend?'))) return;
    try {
      const r = await apiClient.post('/super-admin/founder/clear-cache');
      toast.success(`Caches limpiadas: ${(r?.cleared || []).join(', ')}`);
    } catch (err) {
      toast.error(err?.message || 'Error');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-white/40 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <SAPageHeader
        title={t('founder.title', 'Founder console')}
        subtitle={t('founder.subtitle', 'Acciones críticas exclusivas del founder.')}
      />

      <SACard className="p-5 border-red-500/40 bg-red-500/[0.04]">
        <div className="flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-red-300 mt-0.5" />
          <p className="text-sm text-red-200">
            {t('founder.warning', 'Las tasas de comisión son INVIOLABLES. Cambiarlas afecta a todos los splits futuros y crea inconsistencia con el ledger histórico. Solo cambiar en migración acordada.')}
          </p>
        </div>
      </SACard>

      <SACard className="p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">{t('founder.commissions', 'Comisiones')}</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-white/40 block mb-1">FREE</label>
            <SAInput value={String(draft.FREE)} onChange={(v) => setDraft({ ...draft, FREE: v })} placeholder="0.20" className="w-full" />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">PRO</label>
            <SAInput value={String(draft.PRO)} onChange={(v) => setDraft({ ...draft, PRO: v })} placeholder="0.18" className="w-full" />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">ELITE</label>
            <SAInput value={String(draft.ELITE)} onChange={(v) => setDraft({ ...draft, ELITE: v })} placeholder="0.17" className="w-full" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-white/40 block mb-1">Hercules</label>
            <SAInput value={String(draft.hercules)} onChange={(v) => setDraft({ ...draft, hercules: v })} placeholder="0.03" className="w-full" />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">Atenea</label>
            <SAInput value={String(draft.atenea)} onChange={(v) => setDraft({ ...draft, atenea: v })} placeholder="0.05" className="w-full" />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">Zeus</label>
            <SAInput value={String(draft.zeus)} onChange={(v) => setDraft({ ...draft, zeus: v })} placeholder="0.07" className="w-full" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={acknowledge} onChange={(e) => setAcknowledge(e.target.checked)} />
          {t('founder.ackLabel', 'Confirmo que esto rompe la consistencia histórica del ledger')}
        </label>
        <SAInput type="password" value={password} onChange={setPassword} placeholder={t('founder.passwordPlaceholder', 'Password founder')} className="w-full" />
        <SAButton variant="danger" onClick={submitRates} disabled={submitting || !acknowledge || !password}>
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('founder.applyRates', 'Aplicar nuevas comisiones')}
        </SAButton>
      </SACard>

      <SACard className="p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">{t('founder.criticalActions', 'Acciones críticas')}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 block mb-1">{t('founder.logoutReason', 'Motivo del force logout (min 30)')}</label>
            <SAInput value={logoutReason} onChange={setLogoutReason} className="w-full" />
          </div>
          <SAButton variant="danger" onClick={forceLogoutAll}>
            {t('founder.forceLogoutAll', 'Forzar logout de todos los usuarios')}
          </SAButton>
        </div>
        <div>
          <SAButton variant="secondary" onClick={clearCache}>
            {t('founder.clearCache', 'Limpiar caches en memoria')}
          </SAButton>
        </div>
      </SACard>
    </div>
  );
}
