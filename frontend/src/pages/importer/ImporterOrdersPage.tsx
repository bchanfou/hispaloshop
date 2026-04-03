// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Truck, ExternalLink, Search, ChevronDown, MessageCircle, PackageCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../context/LocaleContext';
import apiClient from '../../services/api/client';
import i18n from "../../locales/i18n";
const fmtPrice = (value, cur = 'EUR') => (Number(value) || 0).toLocaleString(undefined, {
  style: 'currency',
  currency: cur
});
const ORDER_FILTERS = [{
  id: 'all',
  label: 'Todos'
}, {
  id: 'pending',
  label: 'Esperando'
}, {
  id: 'confirmed_by_producer',
  label: 'Confirmados'
}, {
  id: 'paid',
  label: 'Pagados'
}, {
  id: 'shipped',
  label: 'En camino'
}, {
  id: 'delivered',
  label: 'Recibidos'
}];
const B2B_STATUS = {
  pending: {
    label: 'Esperando productor',
    bg: 'bg-stone-100 text-stone-700'
  },
  pending_producer: {
    label: 'Esperando productor',
    bg: 'bg-stone-100 text-stone-700'
  },
  confirmed_by_producer: {
    label: 'Confirmado',
    bg: 'bg-stone-200 text-stone-800'
  },
  paid: {
    label: 'Pagado',
    bg: 'bg-stone-100 text-stone-700'
  },
  shipped: {
    label: 'En camino',
    bg: 'bg-stone-100 text-stone-700'
  },
  delivered: {
    label: 'Recibido',
    bg: 'bg-stone-950 text-white'
  },
  cancelled: {
    label: 'Cancelado',
    bg: 'border border-stone-200 text-stone-400 bg-white'
  },
  rejected: {
    label: 'Rechazado',
    bg: 'border border-stone-200 text-stone-400 bg-white'
  }
};
function B2BOrderStatusBadge({
  status
}) {
  const c = B2B_STATUS[status] || {
    label: status,
    bg: 'bg-stone-100 text-stone-600'
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${c.bg}`}>
      {c.label}
    </span>;
}
function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 0) return 'ahora';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}
function B2BOrderCard({
  order,
  onRefresh
}) {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const handleConfirmDelivery = async () => {
    const opId = order.operation_id || order.id;
    if (!opId) {
      toast.error(i18n.t('importer_orders.idDeOperacionNoDisponible', 'ID de operación no disponible'));
      return;
    }
    setConfirming(true);
    try {
      await apiClient.post(`/b2b/operations/${opId}/confirm-delivery`, {});
      toast.success(i18n.t('importer_orders.recepcionConfirmada', 'Recepción confirmada'));
      onRefresh();
    } catch {
      toast.error(i18n.t('importer_orders.errorAlConfirmarRecepcion', 'Error al confirmar recepción'));
    } finally {
      setConfirming(false);
    }
  };
  const handleApproveAndPay = async () => {
    const opId = order.operation_id || order.id;
    if (!opId) {
      toast.error(i18n.t('importer_orders.idDeOperacionNoDisponible', 'ID de operación no disponible'));
      return;
    }
    setProcessing(true);
    try {
      // Navigate to B2B payment page for this operation
      navigate(`/b2b/payment/${opId}`);
    } catch {
      toast.error(i18n.t('checkout.errorAlProcesarElPago', 'Error al procesar el pago'));
    } finally {
      setProcessing(false);
    }
  };
  const handleReject = async () => {
    const opId = order.operation_id || order.id;
    if (!opId) {
      toast.error(i18n.t('importer_orders.idDePedidoNoDisponible', 'ID de pedido no disponible'));
      return;
    }
    if (!window.confirm('¿Rechazar esta solicitud?')) return;
    try {
      // Cancel the operation (set status to cancelled)
      await apiClient.patch(`/b2b/operations/${opId}/cancel`, {});
      toast.success('Solicitud rechazada');
      onRefresh();
    } catch {
      toast.error('Error al rechazar');
    }
  };
  const products = Array.isArray(order.items) ? order.items : [];
  return <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
      {/* Header — clickable to expand */}
      <button type="button" onClick={() => setExpanded(prev => !prev)} className="w-full flex items-center justify-between px-4 py-2.5 bg-stone-50 border-b border-stone-100 cursor-pointer">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-stone-950">{order.producer_name}</span>
          <span className="text-[11px] text-stone-400">
            #{(order.id || '').slice(-8).toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <B2BOrderStatusBadge status={order.status} />
          <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <div className="p-4">
        {/* Product summary */}
        <div className="flex gap-3 mb-3">
          {order.product_image ? <img loading="lazy" src={order.product_image} alt="" className="w-13 h-13 rounded-2xl object-cover shrink-0" style={{
          width: 52,
          height: 52
        }} /> : <div className="rounded-2xl bg-stone-100 shrink-0" style={{
          width: 52,
          height: 52
        }} />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-950 truncate">{order.product_name}</p>
            <p className="text-xs text-stone-500">
              {order.quantity || '—'} {order.unit || 'uds'} × {fmtPrice(order.unit_price, order.currency)}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-base font-extrabold text-stone-950">
              {fmtPrice(order.total, order.currency)}
            </p>
            <p className="text-[11px] text-stone-400">{formatRelativeTime(order.created_at)}</p>
          </div>
        </div>

        {/* Expanded detail drilldown */}
        <AnimatePresence>
          {expanded && <motion.div initial={{
          height: 0,
          opacity: 0
        }} animate={{
          height: 'auto',
          opacity: 1
        }} exit={{
          height: 0,
          opacity: 0
        }} transition={{
          duration: 0.2
        }} className="overflow-hidden">
              {/* Products list */}
              {products.length > 0 && <div className="mb-3 space-y-2">
                  {products.map((item, idx) => <div key={item.product_id || idx} className="flex items-center gap-2.5 bg-stone-50 rounded-2xl p-2.5">
                      {item.image ? <img src={item.image} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" /> : <div className="w-9 h-9 rounded-xl bg-stone-200 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-stone-950 truncate">{item.name || 'Producto'}</p>
                        <p className="text-[11px] text-stone-500">
                          {item.quantity || 1} × {fmtPrice(item.unit_price, order.currency)}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-stone-950">
                        {fmtPrice(Number(item.quantity || 1) * Number(item.unit_price || 0), order.currency)}
                      </span>
                    </div>)}
                </div>}

              {/* Producer info */}
              <div className="flex items-center gap-2.5 mb-3 bg-stone-50 rounded-2xl p-2.5">
                {order.producer_avatar ? <img src={order.producer_avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" /> : <div className="w-8 h-8 rounded-full bg-stone-200 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-stone-950 truncate">{order.producer_name}</p>
                  <p className="text-[11px] text-stone-500">Productor</p>
                </div>
              </div>

              {/* Total + payment status */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs text-stone-500">Total</span>
                <span className="text-sm font-bold text-stone-950">{fmtPrice(order.total, order.currency)}</span>
              </div>
              {order.payment_status && <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs text-stone-500">Estado de pago</span>
                  <span className="text-xs font-semibold text-stone-700 capitalize">{order.payment_status}</span>
                </div>}

              {/* Action links */}
              <div className="flex gap-2 mb-3">
                <Link to={`/b2b/tracking?op=${order.operation_id || order.id}`} aria-label={`Ver tracking del pedido #${(order.id || '').slice(-8)}`} className="flex-1 py-2 text-center text-xs font-medium border border-stone-200 rounded-2xl text-stone-700 hover:bg-stone-50 transition-colors">
                  Ver tracking
                </Link>
                <button onClick={() => navigate(`/messages/new?to=${order.producer_id || ''}`)} aria-label={`Enviar mensaje a ${order.producer_name || 'productor'}`} className="flex-1 py-2 text-xs font-medium border border-stone-200 rounded-2xl text-stone-700 hover:bg-stone-50 transition-colors flex items-center justify-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" />
                  Mensaje al productor
                </button>
              </div>
            </motion.div>}
        </AnimatePresence>

        {/* Shortcut: Shipped → track */}
        {order.status === 'shipped' && <Link to={`/b2b/tracking?op=${order.operation_id || order.id}`} aria-label={`Rastrear envío del pedido #${(order.id || '').slice(-8)}`} className="flex items-center justify-center gap-1.5 w-full py-2 mb-3 bg-stone-100 hover:bg-stone-200 text-stone-950 text-xs font-semibold rounded-2xl transition-colors">
            <Truck className="w-3.5 h-3.5" />
            Rastrear envío
          </Link>}

        {/* Shortcut: Delivered → confirm reception */}
        {order.status === 'delivered' && <button onClick={handleConfirmDelivery} disabled={confirming} className="flex items-center justify-center gap-1.5 w-full py-2 mb-3 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-semibold rounded-2xl transition-colors">
            {confirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>
                <PackageCheck className="w-3.5 h-3.5" />
                Confirmar recepción
              </>}
          </button>}

        {/* Confirmed by producer — approve & pay */}
        {order.status === 'confirmed_by_producer' && <div className="bg-stone-50 shadow-sm rounded-2xl p-3 mb-3">
            <p className="text-sm font-bold text-stone-950 mb-1">
              ✓ El productor confirmó disponibilidad
            </p>
            <p className="text-xs text-stone-500 mb-2">
              Precio final: {fmtPrice(order.confirmed_unit_price || order.unit_price, order.currency)}/{order.unit || 'ud'}
              {order.producer_notes && <span className="block mt-1">Nota: "{order.producer_notes}"</span>}
            </p>
            <div className="flex gap-2">
              <button onClick={handleApproveAndPay} disabled={processing} className="flex-1 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-medium rounded-2xl transition-colors flex items-center justify-center gap-1">
                {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '✓ Aprobar y pagar →'}
              </button>
              <button onClick={handleReject} className="px-3 py-2 border border-stone-200 rounded-2xl text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors">
                Rechazar
              </button>
            </div>
          </div>}

        {/* Tracking info */}
        {order.status === 'shipped' && order.tracking_number && <div className="bg-stone-50 rounded-2xl p-3 text-xs text-stone-700 flex items-center gap-2">
            <Truck className="w-4 h-4 shrink-0" />
            Tracking: <strong>{order.tracking_number}</strong>
            {order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="ml-auto text-stone-950 font-semibold hover:underline flex items-center gap-1">
                Seguir <ExternalLink className="w-3 h-3" />
              </a>}
          </div>}
      </div>
    </div>;
}
export default function ImporterOrdersPage() {
  const [filter, setFilter] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        limit: '30'
      });
      if (filter !== 'all') qs.set('status', filter);
      const data = await apiClient.get(`/importer/b2b-orders?${qs.toString()}`);
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
  return <div>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-stone-950 mb-3">Mis pedidos B2B</h1>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{
        scrollbarWidth: 'none'
      }}>
          {ORDER_FILTERS.map(f => <button key={f.id} onClick={() => setFilter(f.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 ${filter === f.id ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
              {f.label}
            </button>)}
        </div>
      </div>

      {/* Orders list */}
      {loading ? <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-stone-100 animate-pulse" />)}
        </div> : orders.length === 0 ? <div className="text-center py-16">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm font-semibold text-stone-950">Sin pedidos B2B</p>
          <Link to="/importer/catalog" className="inline-flex items-center mt-3 px-4 py-2 bg-stone-950 hover:bg-stone-800 text-white text-sm font-medium rounded-2xl transition-colors">
            Explorar catálogo →
          </Link>
        </div> : orders.map(order => <B2BOrderCard key={order.id} order={order} onRefresh={fetchOrders} />)}
    </div>;
}