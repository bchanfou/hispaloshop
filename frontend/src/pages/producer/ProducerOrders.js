import React, { useState, useEffect } from 'react';
import { ShoppingBag, MapPin, Package, Truck, Check, Clock, X, ExternalLink, Loader2, Send } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/api/client';
import { asNumber } from '../../utils/safe';

const statusColors = {
  pending: 'bg-gray-100 text-gray-700',
  paid: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-amber-100 text-amber-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700'
};

const statusIcons = {
  pending: Clock,
  paid: Check,
  confirmed: Check,
  preparing: Package,
  shipped: Truck,
  delivered: Check,
  cancelled: X
};

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-primary p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck className="w-6 h-6" />
              <div>
                <h2 className="font-semibold">{t('orders.shipping.title')}</h2>
                <p className="text-sm opacity-80">{t('orders.orderNumber', { number: order.order_id?.slice(0, 8) })}</p>
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
            <Label htmlFor="carrier" className="text-sm font-medium">
              {t('orders.shipping.carrier')}
            </Label>
            <select
              id="carrier"
              value={formData.shipping_carrier}
              onChange={(e) => setFormData({ ...formData, shipping_carrier: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
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
            <Label htmlFor="tracking" className="text-sm font-medium">
              {t('orders.shipping.trackingNumber')} <span className="text-text-muted">{t('orders.shipping.trackingOptional')}</span>
            </Label>
            <Input
              id="tracking"
              value={formData.tracking_number}
              onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
              placeholder={t('orders.shipping.trackingPlaceholder')}
              className="mt-1"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-sm font-medium">
              {t('orders.shipping.internalNotes')} <span className="text-text-muted">{t('orders.shipping.trackingOptional')}</span>
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('orders.shipping.notesPlaceholder')}
              rows={2}
              className="mt-1"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p className="flex items-start gap-2">
              <Send className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                {t('orders.shipping.emailNotice')}
              </span>
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              {t('orders.shipping.cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2"
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
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProducerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showShipModal, setShowShipModal] = useState(false);
  const [orderToShip, setOrderToShip] = useState(null);
  const { t } = useTranslation();

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
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await apiClient.get('/producer/orders');
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShipOrder = (order) => {
    // For shipping, validate status
    if (!['paid', 'confirmed', 'preparing'].includes(order.status)) {
      toast.error(`${t('orders.cannotMarkShipped')} ${t('orders.currentStatus')}: ${statusLabels[order.status] || order.status}`);
      return;
    }
    setOrderToShip(order);
    setShowShipModal(true);
  };

  const handleUpdateStatus = async (order, newStatus) => {
    try {
      await apiClient.put(`/orders/${order.order_id}/status`, { status: newStatus });
      toast.success(`${t('orders.orderUpdatedTo')}: ${statusLabels[newStatus]}`);
      setOrders(orders.map(o =>
        o.order_id === order.order_id
          ? { ...o, status: newStatus, updated_at: new Date().toISOString() }
          : o
      ));
    } catch (error) {
      const msg = error.message || t('orders.errorUpdating');
      toast.error(msg);
    }
  };

  const handleShipSuccess = (orderId, shipData) => {
    setOrders(orders.map(o =>
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-text-primary mb-2">
        {t('orders.myOrders')}
      </h1>
      <p className="text-text-muted mb-8">
        {t('orders.manageOrders')}
      </p>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <ShoppingBag className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">{t('orders.noOrders')}</h3>
          <p className="text-text-muted">{t('orders.noOrdersDescription')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const StatusIcon = statusIcons[order.status] || Clock;
            const showShipButton = canMarkAsShipped(order.status);
            const canUpdate = canUpdateStatus(order.status);
            const nextStatus = nextStatusMap[order.status];
            const nextLabel = getNextStatusLabel(order.status, t);
            
            return (
              <div 
                key={order.order_id} 
                className="bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Order Header */}
                <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${statusColors[order.status] || 'bg-stone-100'}`}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">
                        {t('orders.orderNumber')} #{order.order_id?.slice(0, 8)}
                      </p>
                      <p className="text-sm text-text-muted">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
                      {getStatusLabel(order.status, t)}
                    </span>
                    
                    {/* Action Buttons */}
                    {canUpdate && nextStatus && (
                      <div className="flex gap-2">
                        {/* For preparing -> shipped, show modal with tracking */}
                        {order.status === 'preparing' ? (
                          <Button
                            onClick={() => handleShipOrder(order)}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                            data-testid={`ship-order-${order.order_id}`}
                          >
                            <Truck className="w-4 h-4" />
                            {nextLabel}
                          </Button>
                        ) : order.status === 'shipped' ? (
                          <Button
                            onClick={() => handleUpdateStatus(order, 'delivered')}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                            data-testid={`deliver-order-${order.order_id}`}
                          >
                            <Check className="w-4 h-4" />
                            {nextLabel}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleUpdateStatus(order, nextStatus)}
                            className="flex items-center gap-2"
                            data-testid={`update-order-${order.order_id}`}
                          >
                            <Package className="w-4 h-4" />
                            {nextLabel}
                          </Button>
                        )}
                        
                        {/* Quick ship button for paid/confirmed */}
                        {['paid', 'confirmed'].includes(order.status) && (
                          <Button
                            variant="outline"
                            onClick={() => handleShipOrder(order)}
                            className="flex items-center gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                            data-testid={`quick-ship-${order.order_id}`}
                          >
                            <Truck className="w-4 h-4" />
                            {t('orders.shipDirectly')}
                          </Button>
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
                      <p className="text-sm font-medium text-text-secondary mb-2">{t('orders.products')}</p>
                      <div className="space-y-2">
                        {order.line_items?.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-2 bg-stone-50 rounded-lg">
                            {item.image && (
                              <img 
                                src={item.image} 
                                alt={item.product_name}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium text-text-primary">{item.product_name}</p>
                              <p className="text-xs text-text-muted">
                                {item.quantity} x €{asNumber(item.price).toFixed(2)}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-text-primary">
                              €{(asNumber(item.quantity) * asNumber(item.price)).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipping Info */}
                    <div>
                      <p className="text-sm font-medium text-text-secondary mb-2">{t('orders.shipping.title')}</p>
                      {order.shipping_address ? (
                        <div className="p-3 bg-stone-50 rounded-lg text-sm">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-text-muted mt-0.5" />
                            <div>
                              <p className="font-medium">{order.shipping_address.name}</p>
                              <p className="text-text-muted">{order.shipping_address.street}</p>
                              <p className="text-text-muted">
                                {order.shipping_address.postal_code} {order.shipping_address.city}
                              </p>
                              <p className="text-text-muted">{order.shipping_address.country}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-text-muted">{t('orders.noShippingInfo')}</p>
                      )}

                      {/* Tracking Info (if shipped) */}
                      {order.status === 'shipped' && (order.tracking_number || order.shipping_carrier) && (
                        <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm">
                          <p className="font-medium text-purple-800 flex items-center gap-1 mb-1">
                            <Truck className="w-4 h-4" />
                            {t('orders.shippingInfo')}
                          </p>
                          {order.shipping_carrier && (
                            <p className="text-purple-700">{t('orders.shipping.carrier')}: {order.shipping_carrier}</p>
                          )}
                          {order.tracking_number && (
                            <p className="text-purple-700 font-mono">{order.tracking_number}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Total */}
                  <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between">
                    <div className="text-sm text-text-muted">
                      {t('orders.customer')}: {order.user_email}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-text-muted">{t('orders.orderTotal')}</p>
                      <p className="text-xl font-bold text-text-primary">€{asNumber(order.total_amount).toFixed(2)}</p>
                      <p className="text-xs text-green-600">{t('orders.yourShare')}: €{(asNumber(order.total_amount) * 0.82).toFixed(2)}</p>
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