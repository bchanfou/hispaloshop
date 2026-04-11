import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { SACard, SAPageHeader, SAButton } from '../../components/super-admin/SAUI';
import { Power, Loader2, AlertOctagon } from 'lucide-react';
import { toast } from 'sonner';

const FLAGS = [
  { key: 'registrations', labelKey: 'superAdmin.kill.registrations', label: 'Bloquear registros nuevos' },
  { key: 'checkout', labelKey: 'superAdmin.kill.checkout', label: 'Bloquear checkout' },
  { key: 'readonly', labelKey: 'superAdmin.kill.readonly', label: 'Modo solo-lectura (excepto super admin)' },
  { key: 'all', labelKey: 'superAdmin.kill.all', label: 'Cerrar plataforma completa' },
];

export default function SuperAdminKillSwitches() {
  const { t } = useTranslation();
  const [state, setState] = useState({ switches: {}, history: [] });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // {flag, willEnable}
  const [reason, setReason] = useState('');
  const [confirmName, setConfirmName] = useState('');
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/super-admin/system/kill-switch');
      setState(data || { switches: {}, history: [] });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const requestToggle = (flag) => {
    const willEnable = !state.switches?.[flag];
    setModal({ flag, willEnable });
    setReason('');
    setConfirmName('');
  };

  const submit = async () => {
    if (!modal) return;
    if (reason.trim().length < 30) {
      toast.error(t('superAdmin.kill.reasonMin', 'El motivo debe tener al menos 30 caracteres'));
      return;
    }
    if (confirmName.trim() !== modal.flag) {
      toast.error(t('superAdmin.kill.typeFlag', 'Escribe el nombre del flag exactamente'));
      return;
    }
    setActing(true);
    try {
      await apiClient.post('/super-admin/system/kill-switch', {
        flag: modal.flag,
        enabled: modal.willEnable,
        reason: reason.trim(),
      });
      toast.success(t('superAdmin.kill.applied', 'Kill switch aplicado'));
      setModal(null);
      await load();
    } catch (err) {
      toast.error(err?.message || t('superAdmin.kill.error', 'Error aplicando kill switch'));
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6">
      <SAPageHeader
        title={t('superAdmin.kill.title', 'Kill switches')}
        subtitle={t('superAdmin.kill.subtitle', 'Frenos de plataforma para emergencias. Founder-only.')}
      />

      <SACard className="p-4 border-red-500/30 bg-red-500/[0.04]">
        <div className="flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-200">
            {t('superAdmin.kill.warning', 'Activar un kill switch impacta a TODOS los usuarios de TODOS los países. Úsalo solo en incidentes reales.')}
          </p>
        </div>
      </SACard>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-white/40 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {FLAGS.map(({ key, labelKey, label }) => {
            const enabled = !!state.switches?.[key];
            return (
              <SACard key={key} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">{t(labelKey, label)}</h3>
                    <p className="text-xs text-white/40 mt-1 font-mono">{key}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full border ${enabled ? 'bg-red-500/15 text-red-200 border-red-500/40' : 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40'}`}>
                    {enabled ? 'ON' : 'OFF'}
                  </span>
                </div>
                <SAButton
                  variant={enabled ? 'secondary' : 'danger'}
                  onClick={() => requestToggle(key)}
                >
                  <Power className="w-4 h-4" />
                  {enabled ? t('common.disable', 'Desactivar') : t('common.activate', 'Activar')}
                </SAButton>
              </SACard>
            );
          })}
        </div>
      )}

      <SACard className="p-6">
        <h3 className="text-base font-semibold text-white mb-4">{t('superAdmin.kill.history', 'Historial reciente')}</h3>
        {(state.history || []).length === 0 ? (
          <p className="text-sm text-white/40">{t('superAdmin.kill.noHistory', 'Sin cambios registrados.')}</p>
        ) : (
          <div className="space-y-2">
            {[...(state.history || [])].reverse().map((h, i) => (
              <div key={i} className="text-sm text-white/70 border-l-2 border-white/[0.12] pl-3 py-1">
                <span className="text-white">{h.flag}</span> → <span className={h.enabled ? 'text-red-300' : 'text-emerald-300'}>{h.enabled ? 'ON' : 'OFF'}</span>
                <span className="text-white/40 text-xs ml-2">{new Date(h.at).toLocaleString()}</span>
                <p className="text-white/50 text-xs mt-0.5">{h.reason}</p>
              </div>
            ))}
          </div>
        )}
      </SACard>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-[#1A1D27] border border-red-500/40 rounded-2xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white">
              {modal.willEnable ? t('superAdmin.kill.confirmEnable', 'Activar kill switch') : t('superAdmin.kill.confirmDisable', 'Desactivar kill switch')}
            </h3>
            <p className="text-sm text-white/70">
              {t('superAdmin.kill.confirmBody', 'Vas a {{action}} el flag', { action: modal.willEnable ? 'activar' : 'desactivar' })} <span className="font-mono text-red-300">{modal.flag}</span>.
            </p>
            <div>
              <label className="text-xs text-white/40 block mb-1">{t('superAdmin.kill.reasonLabel', 'Motivo (mínimo 30 caracteres)')}</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full bg-[#0c0a09] border border-white/[0.12] rounded-xl px-3 py-2 text-sm text-white"
              />
              <p className="text-xs text-white/30 mt-1">{reason.length} / 30</p>
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">{t('superAdmin.kill.typeFlagLabel', 'Escribe el nombre del flag para confirmar')}</label>
              <input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={modal.flag}
                className="w-full bg-[#0c0a09] border border-white/[0.12] rounded-xl px-3 py-2 text-sm text-white font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <SAButton variant="secondary" onClick={() => setModal(null)}>{t('common.cancel', 'Cancelar')}</SAButton>
              <SAButton variant="danger" onClick={submit} disabled={acting || reason.length < 30 || confirmName !== modal.flag}>
                {acting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('common.confirm', 'Confirmar')}
              </SAButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
