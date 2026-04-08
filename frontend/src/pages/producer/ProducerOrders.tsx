// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, MapPin, Package, Truck, Check, Clock, X, ExternalLink, Loader2, Send, Search, Zap, Download, Printer, MessageCircle, Copy, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/api/client';
import { asNumber } from '../../utils/safe';
import { trackEvent } from '../../utils/analytics';
import FocusTrap from 'focus-trap-react';
import { getStatusColor, getStatusIcon } from '../../components/OrderStatusBadge';

// Status flow for producers
const nextStatusMap = {
  paid: 'preparing',
  confirmed: 'preparing',
  preparing: 'shipped',
  shipped: 'delivered'
};
// Helper function to get status label
const getStatusLabel = (status, t) => {
  const key = `orders.status.${status}`;
  return t(key, status);
};

// Helper function to get next status label
const getNextStatusLabel = (status, t) => {
  const key = `orders.nextStatus.${status}`;
  return t(key, status);
};

const SHIPPING_CARRIERS = [
  { value: 'SEUR', label: 'SEUR' },
  { value: 'MRW', label: 'MRW' },
  { value: 'Correos', label: 'Correos' },
  { value: 'Correos Express', label: 'Correos Express' },
  { value: 'DHL', label: 'DHL' },
  { value: 'UPS', label: 'UPS' },
  { value: 'FedEx', label: 'FedEx' },
  { value: 'GLS', label: 'GLS' },
  { value: 'Nacex', label: 'Nacex' },
  { value: 'Otro', label: 'Otro' }
];

// Ship Order Modal Component
function ShipOrderModal({ order, onClose, onSuccess, t }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tracking_number: '',
    shipping_carrier: '',
    notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.put(`/orders/${order.order_id}/status`, {
        status: 'shipped',
        tracking_number: formData.tracking_number || undefined,
        shipping_carrier: formData.shipping_carrier || undefined,
        notes: formData.notes || undefined,
      });

      toast.success(t('orders.shipping.success'));
      onSuccess(order.order_id, formData);
      onClose();
    } catch (error) {
      const msg = error.message || t('orders.errorUpdating');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-950 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck className="w-6 h-6" />
              <div>
                <h2 className="font-semibold">{t('orders.shipping.title')}</h2>
                <p className="text-sm opacity-80">{t('orders.orderNumber', { number: String(order.order_id || '').slice(0, 8) })}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Shipping Carrier */}
          <div>
            <label htmlFor="carrier" className="text-sm font-medium text-stone-950">
              {t('orders.shipping.carrier')}
            </label>
            <select
              id="carrier"
              value={formData.shipping_carrier}
              onChange={(e) => setFormData({ ...formData, shipping_carrier: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 bg-white focus:outline-none focus:border-stone-950"
            >
              <option value="">{t('orders.shipping.selectCarrier')}</option>
              {SHIPPING_CARRIERS.map((carrier) => (
                <option key={carrier.value} value={carrier.value}>
                  {carrier.value === 'Otro' ? t('orders.shipping.other') : carrier.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tracking Number */}
          <div>
            <label htmlFor="tracking" className="text-sm font-medium text-stone-950">
              {t('orders.shipping.trackingNumber')} <span className="text-stone-500">{t('orders.shipping.trackingOptional')}</span>
            </label>
            <input
              id="tracking"
              value={formData.tracking_number}
              onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
              placeholder={t('orders.shipping.trackingPlaceholder')}
              className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="text-sm font-medium text-stone-950">
              {t('orders.shipping.internalNotes')} <span className="text-stone-500">{t('orders.shipping.trackingOptional')}</span>
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('orders.shipping.notesPlaceholder')}
              rows={2}
              className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
            />
          </div>

          {/* Info Box */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 text-sm text-stone-700">
            <p className="flex items-start gap-2">
              <Send className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                {t('orders.shipping.emailNotice')}
              </span>
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {t('orders.shipping.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('orders.shipping.processing')}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {t('orders.shipping.confirm')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </FocusTrap>
  );
}

const useOrderFilters = (t: any) => [
  { key: 'all', label: t('orders.filterAll', 'Todos') },
  { key: 'confirmed', label: t('orders.filterNew', 'Nuevos'), statuses: ['paid', 'confirmed'] },
  { key: 'preparing', label: t('orders.status.preparing', 'Preparando'), statuses: ['preparing'] },
  { key: 'shipped', label: t('orders.filterShipped', 'Enviados'), statuses: ['shipped'] },
  { key: 'delivered', label: t('orders.filterDelivered', 'Entregados'), statuses: ['delivered'] },
  { key: 'cancelled', label: t('orders.filterCancelled', 'Cancelados'), statuses: ['cancelled', 'refunded'] },
];

export default function ProducerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showShipModal, setShowShipModal] = useState(false);
  const [orderToShip, setOrderToShip] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all | today | 7d | 30d
  const [error, setError] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const statusLabels = {
    pending: t('orders.status.pending'),
    paid: t('orders.status.paid'),
    confirmed: t('orders.status.confirmed'),
    preparing: t('orders.status.preparing'),
    shipped: t('orders.status.shipped'),
    delivered: t('orders.status.delivered'),
    cancelled: t('orders.status.cancelled')
  };

  const nextStatusLabels = {
    paid: t('orders.actions.startPreparing'),
    confirmed: t('orders.actions.startPreparing'),
    preparing: t('orders.actions.markAsShipped'),
    shipped: t('orders.actions.markAsDelivered')
  };

  useEffect(() => {
    fetchOrders();
    trackEvent('producer_orders_viewed', { tab: activeFilter });
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await apiClient.get('/producer/orders');
      setOrders(Array.isArray(data) ? data : data?.orders || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const orderFilters = useOrderFilters(t);
  
  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (activeFilter !== 'all') {
      const tab = orderFilters.find(f => f.key === activeFilter);
      if (tab?.statuses) filtered = filtered.filter(o => tab.statuses.includes(o.status));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.order_id?.toLowerCase().includes(q) ||
        o.order_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.user_email?.toLowerCase().includes(q) ||
        o.shipping_address?.name?.toLowerCase().includes(q)
      );
    }
    // Date filter
    if (dateFilter !== 'all') {
      const now = Date.now();
      const ms = { today: 86400000, '7d': 7 * 86400000, '30d': 30 * 86400000 };
      const cutoff = now - (ms[dateFilter] || 0);
      filtered = filtered.filter(o => new Date(o.created_at).getTime() >= cutoff);
    }
    return filtered;
  }, [orders, activeFilter, searchQuery, dateFilter]);

  const handleShipOrder = (order) => {
    // For shipping, validate status
    if (!['paid', 'confirmed', 'preparing'].includes(order.status)) {
      toast.error(`${t('orders.cannotMarkShipped')} ${t('orders.currentStatus')}: ${statusLabels[order.status] || order.status}`);
      return;
    }
    setOrderToShip(order);
    setShowShipModal(true);
  };

  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [quickUpdatingId, setQuickUpdatingId] = useState(null);
  // Unified busy check — prevents both quick and full update from firing simultaneously
  const isOrderBusy = (orderId) => updatingOrderId === orderId || quickUpdatingId === orderId;

  const handleUpdateStatus = async (order, newStatus) => {
    if (isOrderBusy(order.order_id)) return;
    setUpdatingOrderId(order.order_id);
    try {
      await apiClient.put(`/orders/${order.order_id}/status`, { status: newStatus });
      trackEvent('producer_order_status_changed', { order_id: order.order_id, from_status: order.status, to_status: newStatus });
      toast.success(`${t('orders.orderUpdatedTo')}: ${statusLabels[newStatus]}`);
      setOrders(prev => prev.map(o =>
        o.order_id === order.order_id
          ? { ...o, status: newStatus, updated_at: new Date().toISOString() }
          : o
      ));
    } catch (error) {
      const msg = error.message || t('orders.errorUpdating');
      toast.error(msg);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Quick inline status update using PATCH endpoint
  const handleQuickStatus = async (order, newStatus) => {
    if (isOrderBusy(order.order_id)) return;
    if (newStatus === 'shipped') {
      // Open the ship modal for tracking URL
      handleShipOrder(order);
      return;
    }
    setQuickUpdatingId(order.order_id);
    try {
      await apiClient.patch(`/producer/orders/${order.order_id}/status`, { status: newStatus });
      trackEvent('producer_order_status_changed', { order_id: order.order_id, from_status: order.status, to_status: newStatus });
      toast.success(`${t('orders.orderUpdatedTo')}: ${statusLabels[newStatus] || newStatus}`);
      setOrders(prev => prev.map(o =>
        o.order_id === order.order_id
          ? { ...o, status: newStatus, updated_at: new Date().toISOString() }
          : o
      ));
    } catch (error) {
      const msg = error.message || t('orders.errorUpdating');
      toast.error(msg);
    } finally {
      setQuickUpdatingId(null);
    }
  };

  const handleShipSuccess = (orderId, shipData) => {
    trackEvent('producer_order_status_changed', { order_id: orderId, from_status: 'preparing', to_status: 'shipped' });
    if (shipData.tracking_number) trackEvent('producer_tracking_added', { order_id: orderId });
    setOrders(prev => prev.map(o =>
      o.order_id === orderId
        ? {
            ...o,
            status: 'shipped',
            tracking_number: shipData.tracking_number,
            shipping_carrier: shipData.shipping_carrier,
            shipped_at: new Date().toISOString()
          }
        : o
    ));
  };

  const canMarkAsShipped = (status) => {
    return ['paid', 'confirmed', 'preparing'].includes(status);
  };

  const canUpdateStatus = (status) => {
    return ['paid', 'confirmed', 'preparing', 'shipped'].includes(status);
  };

  // CSV export
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;
    const cur = (o) => o?.currency || 'EUR';
    const rows = filteredOrders.map(o => ({
      'ID': String(o.order_id || '').slice(-8).toUpperCase(),
      'Fecha': new Date(o.created_at).toLocaleDateString('es-ES'),
      'Cliente': o.customer_name || '',
      'Items': (o.items || o.line_items || []).map(i => `${i.product_name} x${i.quantity}`).join('; '),
      'Total': asNumber(o.total).toFixed(2),
      'Tu parte': asNumber(o.producer_share ?? (asNumber(o.total) * (1 - asNumber(o.commission_rate, 0.18)))).toFixed(2),
      'Comision %': Math.round(asNumber(o.commission_rate, 0.18) * 100),
      'Status': statusLabels[o.status] || o.status,
      'Tracking': o.tracking_number || '',
    }));
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos-${activeFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent('producer_orders_exported', { format: 'csv', count: filteredOrders.length });
  };

  // Packing slip print
  const handlePrint = (order) => {
    const items = (order.items || order.line_items || []);
    const addr = order.shipping_address || {};
    const w = window.open('', '_blank', 'width=600,height=800');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Packing Slip</title>
      <style>body{font-family:system-ui,sans-serif;padding:40px;color:#1c1917}
      h1{font-size:18px;margin-bottom:4px}h2{font-size:14px;color:#78716c;margin-bottom:24px}
      table{width:100%;border-collapse:collapse;margin-bottom:24px}
      th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #e7e5e4;font-size:13px}
      th{font-weight:600;color:#57534e;font-size:11px;text-transform:uppercase;letter-spacing:0.05em}
      .addr{margin-bottom:24px;font-size:13px;line-height:1.6}
      .footer{margin-top:32px;font-size:12px;color:#78716c;border-top:1px solid #e7e5e4;padding-top:16px}
      @media print{body{padding:20px}}</style>
      </head><body>
      <h1>HispaloShop</h1>
      <h2>Pedido #${String(order.order_id || '').slice(-8).toUpperCase()} — ${new Date(order.created_at).toLocaleDateString('es-ES')}</h2>
      <table><thead><tr><th>Producto</th><th>Cantidad</th></tr></thead><tbody>
      ${items.map(i => `<tr><td>${i.product_name || ''}${i.variant_name ? ' (' + i.variant_name + ')' : ''}</td><td>${i.quantity}</td></tr>`).join('')}
      </tbody></table>
      <div class="addr"><strong>Enviar a:</strong><br/>${addr.name || ''}<br/>${addr.street || ''}<br/>${addr.postal_code || ''} ${addr.city || ''}<br/>${addr.country || ''}</div>
      <div class="footer">Gracias por comprar en HispaloShop.</div>
      </body></html>`);
    w.document.close();
    w.print();
  };

  // Contact client
  const handleContactClient = (order) => {
    const shortId = String(order.order_id || '').slice(-8).toUpperCase();
    const customerId = order.customer_id || order.user_id;
    if (customerId) {
      navigate(`/messages?to=${customerId}&prefill=${encodeURIComponent(`Hola, sobre tu pedido #${shortId}...`)}`);
    } else {
      navigate('/messages');
    }
  };

  // Copy address
  const handleCopyAddress = (addr) => {
    if (!addr) return;
    const text = [addr.name, addr.street, `${addr.postal_code || ''} ${addr.city || ''}`, addr.country].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text).then(() => toast.success(t('producerOrders.addressCopied', 'Direccion copiada')));
  };

  // Retry handler for error state
  const fetchOrdersWithError = async () => {
    setError(false);
    setLoading(true);
    try {
      const data = await apiClient.get('/producer/orders');
      setOrders(Array.isArray(data) ? data : data?.orders || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 pt-4">
        <div className="h-8 w-48 bg-stone-100 rounded-2xl animate-pulse" />
        <div className="h-10 w-full bg-stone-100 rounded-2xl animate-pulse" />
        <div className="flex gap-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-9 w-24 bg-stone-100 rounded-full animate-pulse" />
          ))}
        </div>
        {[1,2,3].map(i => (
          <div key={i} className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-stone-100 rounded-2xl animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-stone-100 rounded animate-pulse" />
                <div className="h-3 w-24 bg-stone-100 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-12 bg-stone-50 rounded-2xl animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShoppingBag className="w-12 h-12 text-stone-300 mb-4" />
        <p className="text-stone-600 font-medium mb-2">{t('orders.errorLoading', 'Error al cargar pedidos')}</p>
        <p className="text-stone-500 text-sm mb-4">{t('orders.tryAgain', 'Comprueba tu conexión e inténtalo de nuevo.')}</p>
        <button
          type="button"
          onClick={fetchOrdersWithError}
          className="px-4 py-2 bg-stone-950 hover:bg-stone-800 text-white text-sm rounded-2xl transition-colors"
        >
          {t('common.retry', 'Reintentar')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[975px] mx-auto">
      <div className="flex items-center justify-between mb-2 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-950">
            {t('orders.myOrders')}
          </h1>
          <p className="text-stone-500">
            {t('orders.manageOrders')}
          </p>
        </div>
        {filteredOrders.length > 0 && (
          <button
            type="button"
            onClick={handleExportCSV}
            className="shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium border border-stone-200 rounded-2xl hover:bg-stone-50 transition-colors"
            data-testid="export-csv"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t('producerOrders.exportCSV', 'Exportar CSV')}</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar por nº pedido o cliente..."
          className="h-10 w-full pl-10 pr-4 rounded-xl bg-stone-100 border-none text-sm text-stone-950 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-300"
        />
      </div>

      {/* Date filter */}
      <div className="flex gap-2 mb-3">
        {[
          { key: 'all', label: t('producerOrders.dateAll', 'Todo') },
          { key: 'today', label: t('producerOrders.dateToday', 'Hoy') },
          { key: '7d', label: t('producerOrders.date7d', '7 dias') },
          { key: '30d', label: t('producerOrders.date30d', '30 dias') },
        ].map(d => (
          <button key={d.key} onClick={() => setDateFilter(d.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${dateFilter === d.key ? 'bg-stone-200 text-stone-950' : 'text-stone-500 hover:bg-stone-100'}`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1">
        {orderFilters.map(tab => {
          const count = tab.key === 'all' ? orders.length : orders.filter(o => tab.statuses?.includes(o.status)).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFilter === tab.key
                  ? 'bg-stone-950 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {tab.label} {count > 0 && <span className="ml-1 text-xs opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <ShoppingBag className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-950 mb-2">
            {activeFilter === 'all' ? t('orders.noOrders') : t('orders.noOrdersInCategory', 'Sin pedidos en esta categoría')}
          </h3>
          {activeFilter === 'all' && <p className="text-stone-500">{t('orders.noOrdersDescription')}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const StatusIcon = getStatusIcon(order.status);
            const showShipButton = canMarkAsShipped(order.status);
            const canUpdate = canUpdateStatus(order.status);
            const nextStatus = nextStatusMap[order.status];
            const nextLabel = getNextStatusLabel(order.status, t);

            return (
              <div
                key={order.order_id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Order Header */}
                <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-2xl ${getStatusColor(order.status)}`}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-stone-950">
                        {t('orders.orderNumber')} #{String(order.order_id || '').slice(0, 8)}
                      </p>
                      <p className="text-sm text-stone-500">
                        {new Date(order.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status, t)}
                    </span>

                    {/* Quick inline action buttons */}
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleQuickStatus(order, 'confirmed')}
                        disabled={isOrderBusy(order.order_id)}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full border border-stone-200 hover:bg-stone-50 transition-colors disabled:opacity-50"
                        data-testid={`quick-confirm-${order.order_id}`}
                      >
                        {quickUpdatingId === order.order_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Zap className="w-3 h-3" />
                        )}
                        Confirmar
                      </button>
                    )}
                    {order.status === 'confirmed' && (
                      <button
                        onClick={() => handleQuickStatus(order, 'preparing')}
                        disabled={isOrderBusy(order.order_id)}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full border border-stone-200 hover:bg-stone-50 transition-colors disabled:opacity-50"
                        data-testid={`quick-prepare-inline-${order.order_id}`}
                      >
                        <Package className="w-3 h-3" />
                        Preparar pedido
                      </button>
                    )}

                    {/* Action Buttons */}
                    {canUpdate && nextStatus && (
                      <div className="flex gap-2">
                        {/* For preparing -> shipped, show modal with tracking */}
                        {order.status === 'preparing' ? (
                          <button
                            onClick={() => handleShipOrder(order)}
                            className="flex items-center gap-2 px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors"
                            data-testid={`ship-order-${order.order_id}`}
                          >
                            <Truck className="w-4 h-4" />
                            {nextLabel}
                          </button>
                        ) : order.status === 'shipped' ? (
                          <button
                            onClick={() => handleUpdateStatus(order, 'delivered')}
                            disabled={isOrderBusy(order.order_id)}
                            className="flex items-center gap-2 px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors"
                            data-testid={`deliver-order-${order.order_id}`}
                          >
                            <Check className="w-4 h-4" />
                            {updatingOrderId === order.order_id ? 'Actualizando...' : nextLabel}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(order, nextStatus)}
                            disabled={isOrderBusy(order.order_id)}
                            className="flex items-center gap-2 px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors"
                            data-testid={`update-order-${order.order_id}`}
                          >
                            <Package className="w-4 h-4" />
                            {updatingOrderId === order.order_id ? 'Actualizando...' : nextLabel}
                          </button>
                        )}

                        {/* Quick ship button for paid/confirmed */}
                        {['paid', 'confirmed'].includes(order.status) && (
                          <button
                            onClick={() => handleShipOrder(order)}
                            className="flex items-center gap-2 px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors"
                            data-testid={`quick-ship-${order.order_id}`}
                          >
                            <Truck className="w-4 h-4" />
                            {t('orders.shipDirectly')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Content */}
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Products */}
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-stone-600 mb-2">{t('orders.products')}</p>
                      <div className="space-y-2">
                        {(order.items || order.line_items)?.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-2 bg-stone-50 rounded-2xl">
                            {(item.image || item.product_image) && (
                              <img
                                src={item.image || item.product_image}
                                alt={item.product_name}
                                className="w-12 h-12 rounded-2xl object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium text-stone-950">{item.product_name}</p>
                              <p className="text-xs text-stone-500">
                                {item.quantity} x {asNumber(item.price).toLocaleString(undefined, { style: 'currency', currency: order?.currency || 'EUR' })}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-stone-950">
                              {(asNumber(item.quantity) * asNumber(item.price)).toLocaleString(undefined, { style: 'currency', currency: order?.currency || 'EUR' })}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipping Info */}
                    <div>
                      <p className="text-sm font-medium text-stone-600 mb-2">{t('orders.shipping.title')}</p>
                      {order.shipping_address ? (
                        <div className="p-3 bg-stone-50 rounded-2xl text-sm">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-stone-500 mt-0.5" />
                            <div>
                              <p className="font-medium">{order.shipping_address.name}</p>
                              <p className="text-stone-500">{order.shipping_address.street}</p>
                              <p className="text-stone-500">
                                {order.shipping_address.postal_code} {order.shipping_address.city}
                              </p>
                              <p className="text-stone-500">{order.shipping_address.country}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-stone-500">{t('orders.noShippingInfo')}</p>
                      )}

                      {/* Tracking Info (if shipped) */}
                      {order.status === 'shipped' && (order.tracking_number || order.shipping_carrier) && (
                        <div className="mt-3 p-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm">
                          <p className="font-medium text-stone-950 flex items-center gap-1 mb-1">
                            <Truck className="w-4 h-4" />
                            {t('orders.shippingInfo')}
                          </p>
                          {order.shipping_carrier && (
                            <p className="text-stone-700">{t('orders.shipping.carrier')}: {order.shipping_carrier}</p>
                          )}
                          {order.tracking_number && (
                            <p className="text-stone-700 font-mono">{order.tracking_number}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick actions row */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => handlePrint(order)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-200 rounded-2xl hover:bg-stone-50 transition-colors">
                      <Printer className="w-3.5 h-3.5" /> {t('producerOrders.printSlip', 'Imprimir')}
                    </button>
                    <button type="button" onClick={() => handleContactClient(order)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-200 rounded-2xl hover:bg-stone-50 transition-colors">
                      <MessageCircle className="w-3.5 h-3.5" /> {t('producerOrders.contactClient', 'Contactar')}
                    </button>
                    {order.shipping_address && (
                      <button type="button" onClick={() => handleCopyAddress(order.shipping_address)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-200 rounded-2xl hover:bg-stone-50 transition-colors">
                        <Copy className="w-3.5 h-3.5" /> {t('producerOrders.copyAddress', 'Copiar direccion')}
                      </button>
                    )}
                  </div>

                  {/* Financial breakdown */}
                  <div className="mt-4 pt-4 border-t border-stone-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-stone-500">{t('orders.customer')}: {order.user_email || order.customer_name}</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-stone-500">{t('producerOrders.subtotal', 'Subtotal (tus productos)')}</span>
                        <span className="font-medium text-stone-950">{asNumber(order.gross_amount || order.total_amount || order.total).toLocaleString(undefined, { style: 'currency', currency: order?.currency || 'EUR' })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">{t('producerOrders.platformFee', 'Comision plataforma')} ({Math.round(asNumber(order.commission_rate, 0.18) * 100)}%)</span>
                        <span className="text-stone-500">-{asNumber(order.platform_fee || (asNumber(order.total) * asNumber(order.commission_rate, 0.18))).toLocaleString(undefined, { style: 'currency', currency: order?.currency || 'EUR' })}</span>
                      </div>
                      {order.influencer_info && order.influencer_info.influencer_cut > 0 && (
                        <div className="flex justify-between">
                          <span className="text-stone-500">{t('producerOrders.influencerCut', 'Comision embajador')} ({Math.round(asNumber(order.influencer_info.influencer_rate) * 100)}%)</span>
                          <span className="text-stone-500">-{asNumber(order.influencer_info.influencer_cut).toLocaleString(undefined, { style: 'currency', currency: order?.currency || 'EUR' })}</span>
                        </div>
                      )}
                      {order.influencer_info?.first_purchase_discount && (
                        <div className="flex justify-between">
                          <span className="text-stone-400 text-xs">{t('producerOrders.firstPurchaseNote', 'Descuento 1a compra: absorbido por plataforma')}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-stone-100">
                        <span className="font-semibold text-stone-950">{t('producerOrders.yourShare', 'Tu parte')}</span>
                        <span className="text-lg font-bold text-stone-950">{asNumber(order.producer_share ?? ((order.total_amount ?? order.total ?? 0) * (1 - asNumber(order.commission_rate, 0.18)))).toLocaleString(undefined, { style: 'currency', currency: order?.currency || 'EUR' })}</span>
                      </div>
                      <p className="text-[10px] text-stone-400 text-right">Plan {order.commission_plan || 'FREE'}{order.paid_out ? ' — Pagado' : ''}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ship Modal */}
      {showShipModal && orderToShip && (
        <ShipOrderModal
          order={orderToShip}
          onClose={() => {
            setShowShipModal(false);
            setOrderToShip(null);
          }}
          onSuccess={handleShipSuccess}
          t={t}
        />
      )}
    </div>
  );
}
