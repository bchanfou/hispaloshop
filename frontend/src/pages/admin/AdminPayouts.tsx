// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Search, Wallet, Check, X, Clock, Download, Banknote } from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const TABS = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'completed', label: 'Procesados' },
  { id: 'rejected', label: 'Rechazados' },
];

function formatDate(dateStr) {
  if (!dateStr) return '\u2014';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function StatusBadge({ status }) {
  const cfg = {
    pending: { label: 'Pendiente', cls: 'bg-stone-100 text-stone-700 border-stone-200' },
    completed: { label: 'Completado', cls: 'bg-stone-950 text-white border-stone-950' },
    rejected: { label: 'Rechazado', cls: 'bg-stone-100 text-stone-500 border-stone-200' },
  };
  const { label, cls } = cfg[status] || { label: status, cls: 'bg-stone-100 text-stone-600 border-stone-200' };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
}

export default function AdminPayouts() {
  const [tab, setTab] = useState('pending');
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [notes, setNotes] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [showModal, setShowModal] = useState(null); // { payout, action: 'complete' | 'reject' }

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/admin/payouts?status=${tab}`);
      setPayouts(res.payouts || []);
    } catch {
      toast.error('Error al cargar payouts');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const handleProcess = async (action) => {
    if (!showModal) return;
    setProcessingId(showModal.payout.payout_id);
    try {
      await apiClient.put(`/admin/payouts/${showModal.payout.payout_id}/process`, {
        status: action === 'complete' ? 'completed' : 'rejected',
        notes,
        transfer_reference: transferRef,
      });
      toast.success(action === 'complete' ? 'Payout marcado como completado' : 'Payout rechazado');
      setShowModal(null);
      setNotes('');
      setTransferRef('');
      fetchPayouts();
    } catch (err) {
      toast.error(err.message || 'Error al procesar');
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = payouts.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.producer_name || '').toLowerCase().includes(q)
      || (p.producer_email || '').toLowerCase().includes(q)
      || (p.payout_id || '').toLowerCase().includes(q);
  });

  const exportCSV = () => {
    const esc = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
    const header = 'ID,Productor,Email,Monto,Moneda,Estado,Solicitado,Banco,IBAN,SWIFT\n';
    const rows = filtered.map(p => {
      const b = p.bank_details || {};
      return [esc(p.payout_id), esc(p.producer_name), esc(p.producer_email), p.amount, esc(p.currency), esc(p.status), esc(p.requested_at), esc(b.bank_name), esc(b.iban || b.account_number), esc(b.swift_bic)].join(',');
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payouts_${tab}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[975px] mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-950">Payouts Manuales</h1>
          <p className="text-sm text-stone-500">Transferencias bancarias pendientes de procesar</p>
        </div>
        <button type="button" onClick={exportCSV}
          className="flex items-center gap-2 px-3 py-1.5 border border-stone-200 rounded-2xl text-sm text-stone-700 hover:bg-stone-50 transition-colors self-start">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 p-1 rounded-2xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${tab === t.id ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o ID..."
          className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-stone-400" />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-stone-500">
          <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No hay payouts {tab === 'pending' ? 'pendientes' : tab === 'completed' ? 'completados' : 'rechazados'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const b = p.bank_details || {};
            return (
              <div key={p.payout_id} className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Left */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-stone-950 truncate">{p.producer_name}</p>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="text-xs text-stone-500">{p.producer_email} &middot; {formatDate(p.requested_at)}</p>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <p className="text-xl font-bold text-stone-950">{p.amount?.toFixed(2)} {p.currency}</p>
                  </div>
                </div>

                {/* Bank details */}
                <div className="mt-3 pt-3 border-t border-stone-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-stone-400">Banco</span>
                    <p className="text-stone-700 font-medium">{b.bank_name || '\u2014'}</p>
                  </div>
                  <div>
                    <span className="text-stone-400">Titular</span>
                    <p className="text-stone-700 font-medium truncate">{b.account_holder || '\u2014'}</p>
                  </div>
                  <div>
                    <span className="text-stone-400">IBAN / Cuenta</span>
                    <p className="text-stone-700 font-mono text-[11px] truncate">{b.iban || b.account_number || '\u2014'}</p>
                  </div>
                  <div>
                    <span className="text-stone-400">SWIFT</span>
                    <p className="text-stone-700 font-mono">{b.swift_bic || '\u2014'}</p>
                  </div>
                </div>

                {b.notes && (
                  <p className="mt-2 text-xs text-stone-500 italic">{b.notes}</p>
                )}

                {/* Admin notes (for processed) */}
                {p.admin_notes && (
                  <p className="mt-2 text-xs text-stone-600 bg-stone-50 rounded-xl px-3 py-1.5">
                    <strong>Admin:</strong> {p.admin_notes}
                  </p>
                )}
                {p.transfer_reference && (
                  <p className="mt-1 text-xs text-stone-500 font-mono">Ref: {p.transfer_reference}</p>
                )}

                {/* Actions (pending only) */}
                {p.status === 'pending' && (
                  <div className="mt-3 pt-3 border-t border-stone-100 flex gap-2">
                    <button type="button"
                      onClick={() => { setShowModal({ payout: p, action: 'complete' }); setNotes(''); setTransferRef(''); }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-stone-950 text-white rounded-full text-sm font-medium hover:bg-stone-800 transition-colors">
                      <Check className="w-3.5 h-3.5" /> Marcar como pagado
                    </button>
                    <button type="button"
                      onClick={() => { setShowModal({ payout: p, action: 'reject' }); setNotes(''); }}
                      className="flex items-center gap-1.5 px-4 py-2 border border-stone-200 rounded-full text-sm text-stone-600 hover:bg-stone-50 transition-colors">
                      <X className="w-3.5 h-3.5" /> Rechazar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Process Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-stone-950">
              {showModal.action === 'complete' ? 'Confirmar transferencia' : 'Rechazar payout'}
            </h3>
            <p className="text-sm text-stone-600">
              <strong>{showModal.payout.producer_name}</strong> &mdash; {showModal.payout.amount?.toFixed(2)} {showModal.payout.currency}
            </p>

            {showModal.action === 'complete' && (
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Referencia de transferencia</label>
                <input type="text" value={transferRef} onChange={e => setTransferRef(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-1 focus:ring-stone-400"
                  placeholder={t('admin_payouts.nºDeOperacionBancaria', 'Nº de operación bancaria')} />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Notas</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-stone-400 resize-none"
                placeholder={showModal.action === 'complete' ? 'Transferido el dd/mm via ...' : 'Motivo del rechazo...'} maxLength={500} />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowModal(null)}
                className="px-4 py-2 border border-stone-200 rounded-full text-sm text-stone-600 hover:bg-stone-50 transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={() => handleProcess(showModal.action)} disabled={!!processingId}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors disabled:opacity-50 ${
                  showModal.action === 'complete'
                    ? 'bg-stone-950 text-white hover:bg-stone-800'
                    : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                }`}>
                {processingId ? <Loader2 className="w-4 h-4 animate-spin" /> :
                  showModal.action === 'complete' ? 'Confirmar pago' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
