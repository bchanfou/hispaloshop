import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Truck, ExternalLink, Search } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';

const ORDER_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Esperando' },
  { id: 'confirmed_by_producer', label: 'Confirmados' },
  { id: 'paid', label: 'Pagados' },
  { id: 'shipped', label: 'En camino' },
  { id: 'delivered', label: 'Recibidos' },
];

const B2B_STATUS = {
  pending: { label: 'Esperando productor', bg: 'bg-stone-100 text-stone-700' },
  pending_producer: { label: 'Esperando productor', bg: 'bg-stone-100 text-stone-700' },
  confirmed_by_producer: { label: 'Confirmado', bg: 'bg-stone-200 text-stone-800' },
  paid: { label: 'Pagado', bg: 'bg-stone-100 text-stone-700' },
  shipped: { label: 'En camino', bg: 'bg-stone-100 text-stone-700' },
  delivered: { label: 'Recibido', bg: 'bg-stone-950 text-white' },
  cancelled: { label: 'Cancelado', bg: 'border border-stone-200 text-stone-400 bg-white' },
  rejected: { label: 'Rechazado', bg: 'border border-stone-200 text-stone-400 bg-white' },
};

function B2BOrderStatusBadge({ status }) {
  const c = B2B_STATUS[status] || { label: status, bg: 'bg-stone-100 text-stone-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${c.bg}`}>
      {c.label}
    </span>
  );
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function B2BOrderCard({ order, onRefresh }) {
  const [processing, setProcessing] = useState(false);

  const handleApproveAndPay = async () => {
    setProcessing(true);
    try {
      const data = await apiClient.post(`/b2b/orders/${order.id}/approve-and-pay`, {});
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.success('Pedido aprobado y pago procesado');
        onRefresh();
      }
    } catch {
      toast.error('Error al procesar el pago');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm('¿Rechazar esta solicitud?')) return;
    try {
      await apiClient.post(`/b2b/orders/${order.id}/reject`, {});
      toast.success('Solicitud rechazada');
      onRefresh();
    } catch {
      toast.error('Error al rechazar');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-3">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-stone-950">{order.producer_name}</span>
          <span className="text-[11px] text-stone-400">
            #{(order.id || '').slice(-8).toUpperCase()}
          </span>
        </div>
        <B2BOrderStatusBadge status={order.status} />
      </div>

      <div className="p-4">
        {/* Product */}
        <div className="flex gap-3 mb-3">
          {order.product_image ? (
            <img src={order.product_image} alt="" className="w-13 h-13 rounded-xl object-cover shrink-0" style={{ width: 52, height: 52 }} />
          ) : (
            <div className="rounded-xl bg-stone-100 shrink-0" style={{ width: 52, height: 52 }} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-950 truncate">{order.product_name}</p>
            <p className="text-xs text-stone-500">
              {order.quantity || '—'} {order.unit || 'uds'} × {(order.unit_price || 0).toFixed(2)}€
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-base font-extrabold text-stone-950">
              {(order.total || 0).toFixed(2)}€
            </p>
            <p className="text-[11px] text-stone-400">{formatRelativeTime(order.created_at)}</p>
          </div>
        </div>

        {/* Confirmed by producer — approve & pay */}
        {order.status === 'confirmed_by_producer' && (
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 mb-3">
            <p className="text-sm font-bold text-stone-950 mb-1">
              ✓ El productor confirmó disponibilidad
            </p>
            <p className="text-xs text-stone-500 mb-2">
              Precio final: {(order.confirmed_unit_price || order.unit_price || 0).toFixed(2)}€/{order.unit || 'ud'}
              {order.producer_notes && (
                <span className="block mt-1">Nota: "{order.producer_notes}"</span>
              )}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleApproveAndPay}
                disabled={processing}
                className="flex-1 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-1"
              >
                {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '✓ Aprobar y pagar →'}
              </button>
              <button
                onClick={handleReject}
                className="px-3 py-2 border border-stone-200 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Rechazar
              </button>
            </div>
          </div>
        )}

        {/* Tracking */}
        {order.status === 'shipped' && order.tracking_number && (
          <div className="bg-stone-50 rounded-xl p-3 text-xs text-stone-700 flex items-center gap-2">
            <Truck className="w-4 h-4 shrink-0" />
            Tracking: <strong>{order.tracking_number}</strong>
            {order.tracking_url && (
              <a href={order.tracking_url} target="_blank" rel="noopener noreferrer"
                className="ml-auto text-stone-950 font-semibold hover:underline flex items-center gap-1">
                Seguir <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ImporterOrdersPage() {
  const [filter, setFilter] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter === 'all' ? '' : `?status=${filter}`;
      const data = await apiClient.get(`/importer/b2b-orders${params}&limit=30`);
      setOrders(data?.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-stone-950 mb-3">Mis pedidos B2B</h1>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {ORDER_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 ${
                filter === f.id
                  ? 'bg-stone-950 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-stone-100 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm font-semibold text-stone-950">Sin pedidos B2B</p>
          <Link
            to="/importer/catalog"
            className="inline-flex items-center mt-3 px-4 py-2 bg-stone-950 hover:bg-stone-800 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Explorar catálogo →
          </Link>
        </div>
      ) : (
        orders.map(order => (
          <B2BOrderCard key={order.id} order={order} onRefresh={fetchOrders} />
        ))
      )}
    </div>
  );
}
