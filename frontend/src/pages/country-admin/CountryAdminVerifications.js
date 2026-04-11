import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import { apiClient } from '../../services/api/client';
import { Check, X, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CountryAdminVerifications() {
  const { t } = useTranslation();
  const { refreshOverview } = useOutletContext() || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [acting, setActing] = useState(false);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState(null); // 'approve' | 'reject'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: 'pending' });
      if (typeFilter) params.set('type', typeFilter);
      const data = await apiClient.get(`/country-admin/verifications?${params.toString()}`);
      setItems(data?.items || []);
    } catch (err) {
      toast.error(t('countryAdmin.loadError', 'No se pudo cargar la lista'));
    } finally {
      setLoading(false);
    }
  }, [typeFilter, t]);

  useEffect(() => { load(); }, [load]);

  const openModal = (item, m) => {
    setSelected(item);
    setMode(m);
    setReason('');
    setNotes('');
  };

  const close = () => { setSelected(null); setMode(null); setReason(''); setNotes(''); };

  const submit = async () => {
    if (!selected || !mode) return;
    if (mode === 'reject' && reason.trim().length < 20) {
      toast.error(t('countryAdmin.reasonMin20', 'El motivo debe tener al menos 20 caracteres'));
      return;
    }
    setActing(true);
    try {
      const url = `/country-admin/verifications/${selected.user_id}/${mode}`;
      const body = mode === 'reject' ? { reason: reason.trim(), notes } : { notes };
      await apiClient.post(url, body);
      toast.success(mode === 'approve'
        ? t('countryAdmin.approved', 'Verificación aprobada')
        : t('countryAdmin.rejected', 'Verificación rechazada'));
      close();
      await load();
      if (refreshOverview) await refreshOverview();
    } catch (err) {
      toast.error(err?.message || t('countryAdmin.actionError', 'No se pudo completar la acción'));
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-950 tracking-tight">
            {t('countryAdmin.verifications.title', 'Verificaciones')}
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            {t('countryAdmin.verifications.subtitle', 'Aprueba o rechaza nuevos sellers de tu país.')}
          </p>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border border-stone-200 text-sm bg-white"
        >
          <option value="">{t('countryAdmin.filter.all', 'Todos')}</option>
          <option value="producer">{t('countryAdmin.filter.producers', 'Productores')}</option>
          <option value="importer">{t('countryAdmin.filter.importers', 'Importadores')}</option>
        </select>
      </header>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-sm text-stone-500">
            {t('countryAdmin.noVerifications', 'No hay verificaciones pendientes.')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">{t('countryAdmin.col.business', 'Negocio')}</th>
                <th className="text-left px-4 py-3">{t('countryAdmin.col.role', 'Tipo')}</th>
                <th className="text-left px-4 py-3">{t('countryAdmin.col.requestedAt', 'Solicitado')}</th>
                <th className="text-right px-4 py-3">{t('countryAdmin.col.actions', 'Acciones')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((it) => (
                <tr key={it.user_id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-950">{it.company_name || it.name}</p>
                    <p className="text-xs text-stone-500">{it.email}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-700 capitalize">{it.role}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs">
                    {it.requested_at ? new Date(it.requested_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => openModal(it, 'approve')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl bg-stone-950 text-white hover:bg-stone-800"
                    >
                      <Check className="w-3.5 h-3.5" /> {t('common.approve', 'Aprobar')}
                    </button>
                    <button
                      onClick={() => openModal(it, 'reject')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100"
                    >
                      <X className="w-3.5 h-3.5" /> {t('common.reject', 'Rechazar')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {selected && mode && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={close}>
          <div
            className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-stone-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-stone-700" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-950 truncate">
                    {selected.company_name || selected.name}
                  </p>
                  <p className="text-xs text-stone-500">{selected.email}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <h3 className="font-medium text-stone-950">
                {mode === 'approve'
                  ? t('countryAdmin.approveTitle', 'Aprobar verificación')
                  : t('countryAdmin.rejectTitle', 'Rechazar verificación')}
              </h3>
              {mode === 'reject' && (
                <div>
                  <label className="text-xs text-stone-500 block mb-1">
                    {t('countryAdmin.rejectReason', 'Motivo (mínimo 20 caracteres)')}
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm"
                    placeholder={t('countryAdmin.rejectReasonPh', 'Ej: documentación incompleta, certificado expirado...')}
                  />
                  <p className="text-xs text-stone-400 mt-1">{reason.length} / 20</p>
                </div>
              )}
              <div>
                <label className="text-xs text-stone-500 block mb-1">
                  {t('countryAdmin.notes', 'Notas internas (opcional)')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm"
                />
              </div>
            </div>
            <div className="p-6 border-t border-stone-200 flex gap-3 justify-end">
              <button
                onClick={close}
                disabled={acting}
                className="px-4 py-2 rounded-xl border border-stone-200 text-sm text-stone-700 hover:bg-stone-100"
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                onClick={submit}
                disabled={acting || (mode === 'reject' && reason.trim().length < 20)}
                className="px-4 py-2 rounded-xl bg-stone-950 text-white text-sm hover:bg-stone-800 disabled:opacity-40 inline-flex items-center gap-2"
              >
                {acting && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'approve'
                  ? t('common.approve', 'Aprobar')
                  : t('common.reject', 'Rechazar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
