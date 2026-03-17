import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, RotateCcw, Search, AlertTriangle, Check, ChevronDown, Download } from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';

const TABS = [
  { id: 'eligible', label: 'Pedidos elegibles' },
  { id: 'refunded', label: 'Reembolsados' },
];

const STATUS_LABELS = {
  paid: 'Pagado',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  shipped: 'Enviado',
  delivered: 'Entregado',
  refunded: 'Reembolsado',
  partially_refunded: 'Parcial',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function RefundModal({ order, onClose, onRefunded }) {
  const [type, setType] = useState('full');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const total = order?.total_amount || 0;

  const handleRefund = async () => {
    if (type === 'partial' && (!amount || parseFloat(amount) <= 0 || parseFloat(amount) > total)) {
      toast.error('Introduce un importe válido');
      return;
    }
    if (!window.confirm(`¿Confirmar reembolso ${type === 'full' ? 'total' : 'parcial'} de ${type === 'full' ? total.toFixed(2) : parseFloat(amount).toFixed(2)}€?`)) return;

    setProcessing(true);
    try {
      const body = { type };
      if (type === 'partial') body.amount = parseFloat(amount);
      if (reason.trim()) body.reason = reason.trim();
      await apiClient.post(`/payments/refund/${order.order_id}`, body);
      toast.success('Reembolso procesado correctamente');
      onRefunded();
    } catch (err) {
      toast.error(err?.message || 'Error al procesar el reembolso');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-stone-950 mb-1">Procesar reembolso</h3>
        <p className="text-sm text-stone-500 mb-4">
          Pedido #{(order.order_id || '').slice(-8).toUpperCase()} · {total.toFixed(2)}€
        </p>

        {/* Type selector */}
        <div className="flex gap-2 mb-4">
          {['full', 'partial'].map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                type === t ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {t === 'full' ? 'Total' : 'Parcial'}
            </button>
          ))}
        </div>

        {type === 'partial' && (
          <div className="mb-4">
            <label className="text-sm font-medium text-stone-700 mb-1 block">Importe (€)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={total}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={`Máx. ${total.toFixed(2)}`}
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-stone-400"
            />
          </div>
        )}

        {/* Reason */}
        <div className="mb-4">
          <label className="text-sm font-medium text-stone-700 mb-1 block">
            Motivo del reembolso <span className="text-stone-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value.slice(0, 200))}
            maxLength={200}
            rows={3}
            placeholder="Describe el motivo..."
            className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm resize-none focus:outline-none focus:border-stone-400"
          />
          <p className="text-right text-xs text-stone-400 mt-0.5">{reason.length}/200</p>
        </div>

        <div className="bg-stone-50 rounded-xl p-3 mb-4 text-xs text-stone-600">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-stone-700 mb-0.5">Acción irreversible</p>
              <p>Se procesará el reembolso en Stripe y se ajustarán las comisiones automáticamente.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleRefund}
            disabled={processing}
            className="flex-1 py-2.5 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Reembolsar
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderRow({ order, showRefundButton, onRefund }) {
  const status = order.status || 'unknown';
  const isRefunded = status === 'refunded' || status === 'partially_refunded';

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 mb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-stone-950">
            #{(order.order_id || '').slice(-8).toUpperCase()}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            isRefunded ? 'border border-stone-200 text-stone-400 bg-white' : 'bg-stone-100 text-stone-700'
          }`}>
            {STATUS_LABELS[status] || status}
          </span>
        </div>
        <span className="text-sm font-bold text-stone-950">{(order.total_amount || 0).toFixed(2)}€</span>
      </div>

      <div className="flex items-center justify-between text-xs text-stone-500">
        <div>
          <span>{order.user_name || order.user_email || 'Cliente'}</span>
          <span className="mx-1.5">·</span>
          <span>{formatDate(order.created_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          {isRefunded && order.refund_amount != null && (
            <span className="text-xs font-semibold text-stone-700">
              -{order.refund_amount.toFixed(2)}€ {order.refund_type === 'partial' ? '(parcial)' : '(total)'}
            </span>
          )}
          {showRefundButton && !isRefunded && (
            <button
              onClick={() => onRefund(order)}
              className="px-3 py-1.5 bg-stone-950 hover:bg-stone-800 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reembolsar
            </button>
          )}
        </div>
      </div>

      {/* Line items summary */}
      {order.line_items && order.line_items.length > 0 && (
        <div className="mt-2 pt-2 border-t border-stone-100">
          <div className="flex flex-wrap gap-1">
            {order.line_items.slice(0, 3).map((item, i) => (
              <span key={i} className="text-[11px] bg-stone-50 text-stone-600 px-2 py-0.5 rounded-full">
                {item.name || item.product_name || 'Producto'} ×{item.quantity || 1}
              </span>
            ))}
            {order.line_items.length > 3 && (
              <span className="text-[11px] text-stone-400">+{order.line_items.length - 3} más</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminRefunds() {
  const [tab, setTab] = useState('eligible');
  const [search, setSearch] = useState('');
  const [data, setData] = useState({ refunded: [], eligible: [] });
  const [loading, setLoading] = useState(true);
  const [refundOrder, setRefundOrder] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiClient.get('/admin/refunds');
      setData({
        refunded: result?.refunded || [],
        eligible: result?.eligible || [],
      });
    } catch {
      setData({ refunded: [], eligible: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const orders = tab === 'refunded' ? data.refunded : data.eligible;

  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (o.order_id || '').toLowerCase().includes(q) ||
      (o.user_name || '').toLowerCase().includes(q) ||
      (o.user_email || '').toLowerCase().includes(q);
  });

  const totalRefunded = data.refunded.reduce((sum, o) => sum + (o.refund_amount || 0), 0);

  const exportCSV = () => {
    const headers = ['Order ID', 'Customer', 'Amount', 'Status', 'Date'];
    const rows = data.refunded.map(o => [
      o.order_id,
      o.user_name || o.user_email || 'Cliente',
      (o.refund_amount || 0).toFixed(2),
      o.status,
      formatDate(o.created_at),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'refunds.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado');
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-stone-950 mb-1">Gestión de reembolsos</h1>
        <p className="text-sm text-stone-500">
          {data.refunded.length} reembolsos procesados · {totalRefunded.toFixed(2)}€ total
        </p>
      </div>

      {/* Search + Export */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por ID, cliente..."
            className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm bg-white focus:outline-none focus:border-stone-400"
          />
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors text-stone-700 shrink-0"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              tab === t.id ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {t.label}
            {t.id === 'refunded' && data.refunded.length > 0 && ` (${data.refunded.length})`}
            {t.id === 'eligible' && data.eligible.length > 0 && ` (${data.eligible.length})`}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="space-y-2">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-stone-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <RotateCcw className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-stone-950">
            {tab === 'refunded' ? 'Sin reembolsos procesados' : 'Sin pedidos elegibles'}
          </p>
        </div>
      ) : (
        filtered.map(order => (
          <OrderRow
            key={order.order_id}
            order={order}
            showRefundButton={tab === 'eligible'}
            onRefund={setRefundOrder}
          />
        ))
      )}

      {/* Refund modal */}
      {refundOrder && (
        <RefundModal
          order={refundOrder}
          onClose={() => setRefundOrder(null)}
          onRefunded={() => {
            setRefundOrder(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
