import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../services/api/client';
import { Check, EyeOff, X, AlertTriangle, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'pending', labelKey: 'countryAdmin.products.statusPending', label: 'Pendientes' },
  { value: 'reported', labelKey: 'countryAdmin.products.statusReported', label: 'Reportados' },
  { value: 'active', labelKey: 'countryAdmin.products.statusActive', label: 'Activos' },
  { value: 'hidden', labelKey: 'countryAdmin.products.statusHidden', label: 'Ocultos' },
];

export default function CountryAdminProducts() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || 'pending';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // {product, action}
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status });
      if (search) params.set('search', search);
      const data = await apiClient.get(`/country-admin/products?${params.toString()}`);
      setItems(data?.items || []);
    } catch {
      toast.error(t('countryAdmin.loadError', 'No se pudo cargar la lista'));
    } finally {
      setLoading(false);
    }
  }, [status, search, t]);

  useEffect(() => { load(); }, [load]);

  const setStatus = (s) => setSearchParams({ status: s });

  const openModal = (product, action) => { setModal({ product, action }); setReason(''); };
  const close = () => { setModal(null); setReason(''); };

  const submit = async () => {
    if (!modal) return;
    if ((modal.action === 'reject' || modal.action === 'hide') && reason.trim().length < 20) {
      toast.error(t('countryAdmin.reasonMin20', 'El motivo debe tener al menos 20 caracteres'));
      return;
    }
    setActing(true);
    try {
      await apiClient.post(`/country-admin/products/${modal.product.product_id}/moderate`, {
        action: modal.action,
        reason: reason.trim(),
      });
      toast.success(t('countryAdmin.products.moderated', 'Producto moderado'));
      close();
      await load();
    } catch (err) {
      toast.error(err?.message || t('countryAdmin.actionError', 'No se pudo completar la acción'));
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-stone-950 tracking-tight">
          {t('countryAdmin.products.title', 'Productos')}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {t('countryAdmin.products.subtitle', 'Modera el catálogo de tu país.')}
        </p>
      </header>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatus(opt.value)}
            className={`px-4 py-2 rounded-xl text-sm transition-colors ${
              status === opt.value ? 'bg-stone-950 text-white' : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
          >
            {t(opt.labelKey, opt.label)}
          </button>
        ))}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search', 'Buscar...')}
            className="w-full pl-10 pr-3 py-2 rounded-xl border border-stone-200 text-sm bg-white"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-sm text-stone-500">
          {t('countryAdmin.products.empty', 'No hay productos que mostrar.')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <div key={p.product_id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="aspect-video bg-stone-100 relative">
                {p.image_url && (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                )}
                {Array.isArray(p.reports) && p.reports.length > 0 && (
                  <span className="absolute top-2 right-2 bg-stone-950 text-white text-xs px-2 py-1 rounded-full inline-flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {p.reports.length}
                  </span>
                )}
              </div>
              <div className="p-4 space-y-2">
                <p className="font-medium text-stone-950 truncate">{p.name}</p>
                <p className="text-xs text-stone-500">
                  {p.price} {p.currency || 'EUR'} · {p.category || '—'}
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => openModal(p, 'approve')}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs rounded-xl bg-stone-950 text-white hover:bg-stone-800"
                  >
                    <Check className="w-3.5 h-3.5" /> {t('common.approve', 'Aprobar')}
                  </button>
                  <button
                    onClick={() => openModal(p, 'hide')}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100"
                  >
                    <EyeOff className="w-3.5 h-3.5" /> {t('common.hide', 'Ocultar')}
                  </button>
                  <button
                    onClick={() => openModal(p, 'reject')}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100"
                  >
                    <X className="w-3.5 h-3.5" /> {t('common.reject', 'Rechazar')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={close}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-stone-200">
              <h3 className="font-semibold text-stone-950">
                {modal.action === 'approve' && t('countryAdmin.products.approveTitle', 'Aprobar producto')}
                {modal.action === 'reject' && t('countryAdmin.products.rejectTitle', 'Rechazar producto')}
                {modal.action === 'hide' && t('countryAdmin.products.hideTitle', 'Ocultar producto')}
              </h3>
              <p className="text-sm text-stone-500 mt-1">{modal.product.name}</p>
            </div>
            {(modal.action === 'reject' || modal.action === 'hide') && (
              <div className="p-6">
                <label className="text-xs text-stone-500 block mb-1">
                  {t('countryAdmin.rejectReason', 'Motivo (mínimo 20 caracteres)')}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm"
                />
                <p className="text-xs text-stone-400 mt-1">{reason.length} / 20</p>
              </div>
            )}
            <div className="p-6 border-t border-stone-200 flex gap-3 justify-end">
              <button onClick={close} disabled={acting} className="px-4 py-2 rounded-xl border border-stone-200 text-sm text-stone-700 hover:bg-stone-100">
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                onClick={submit}
                disabled={acting || ((modal.action !== 'approve') && reason.trim().length < 20)}
                className="px-4 py-2 rounded-xl bg-stone-950 text-white text-sm hover:bg-stone-800 disabled:opacity-40 inline-flex items-center gap-2"
              >
                {acting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('common.confirm', 'Confirmar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
