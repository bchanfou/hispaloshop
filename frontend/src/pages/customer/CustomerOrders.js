import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { ShoppingBag, Package, ArrowLeft, XCircle, Truck, Check, Clock, MapPin, ExternalLink, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API } from '../../utils/api';



const statusColors = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const statusIcons = {
  pending: Clock,
  confirmed: Check,
  preparing: Package,
  shipped: Truck,
  delivered: Check,
  cancelled: XCircle
};

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

export default function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/customer/orders`, { withCredentials: true });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error(t('orders.loadError', 'Failed to load orders'));
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm(t('orders.cancelConfirm', 'Are you sure you want to cancel this order?'))) return;
    
    try {
      await axios.put(`${API}/customer/orders/${orderId}/cancel`, {}, { withCredentials: true });
      toast.success(t('orders.cancelled', 'Order cancelled'));
      fetchOrders();
      if (selectedOrder?.order_id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: 'cancelled' });
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t('orders.cancelError', 'Cannot cancel this order'));
    }
  };

  const getStatusStep = (status) => {
    const index = STATUS_FLOW.indexOf(status);
    return index >= 0 ? index : 0;
  };

  // Detail View
  if (selectedOrder) {
    const canCancel = ['pending', 'confirmed'].includes(selectedOrder.status);
    const currentStep = getStatusStep(selectedOrder.status);
    const StatusIcon = statusIcons[selectedOrder.status] || Clock;
    
    return (
      <div>
        <button
          onClick={() => setSelectedOrder(null)}
          className="flex items-center gap-2 text-[#7A7A7A] hover:text-[#1C1C1C] mb-6 font-body"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back', 'Back to Orders')}
        </button>

        <div className="bg-white rounded-xl border border-[#DED7CE] p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="font-heading text-2xl font-semibold text-[#1C1C1C]">
                {t('orders.orderNumber', 'Order')} #{selectedOrder.order_id.slice(0, 8)}
              </h2>
              <p className="text-[#7A7A7A] font-body">
                {t('orders.placedOn', 'Placed on')} {new Date(selectedOrder.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right flex items-center gap-3">
              <div className="flex items-center gap-2">
                <StatusIcon className="w-5 h-5" />
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedOrder.status]}`}>
                  {t(`orders.status.${selectedOrder.status}`, selectedOrder.status)}
                </span>
              </div>
              {canCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => cancelOrder(selectedOrder.order_id)}
                  data-testid="cancel-order-btn"
                >
                  <XCircle className="w-4 h-4 mr-1" /> {t('orders.cancel', 'Cancel')}
                </Button>
              )}
            </div>
          </div>

          {/* Order Progress Tracker */}
          {selectedOrder.status !== 'cancelled' && (
            <div className="mb-8 p-4 bg-[#FAF7F2] rounded-lg border border-[#E6DFD6]">
              <h3 className="font-medium text-[#1C1C1C] mb-4">{t('orders.orderProgress', 'Order Progress')}</h3>
              <div className="flex items-center justify-between relative">
                {/* Progress Line */}
                <div className="absolute top-4 left-0 right-0 h-1 bg-[#E6DFD6] rounded">
                  <div 
                    className="h-full bg-green-500 rounded transition-all duration-500"
                    style={{ width: `${(currentStep / (STATUS_FLOW.length - 1)) * 100}%` }}
                  />
                </div>
                
                {/* Status Steps */}
                {STATUS_FLOW.map((status, index) => {
                  const StepIcon = statusIcons[status];
                  const isCompleted = index <= currentStep;
                  const isCurrent = index === currentStep;
                  
                  return (
                    <div key={status} className="flex flex-col items-center relative z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCompleted 
                          ? 'bg-green-500 text-white' 
                          : 'bg-[#E6DFD6] text-[#7A7A7A]'
                      } ${isCurrent ? 'ring-4 ring-green-200' : ''}`}>
                        <StepIcon className="w-4 h-4" />
                      </div>
                      <span className={`mt-2 text-xs font-medium ${
                        isCompleted ? 'text-green-600' : 'text-[#7A7A7A]'
                      }`}>
                        {t(`orders.status.${status}`, status)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tracking Info */}
          {selectedOrder.tracking_number && (
            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
                <Truck className="w-4 h-4" /> {t('orders.trackingInfo', 'Tracking Information')}
              </h3>
              <p className="text-purple-800 font-mono text-lg">{selectedOrder.tracking_number}</p>
              {selectedOrder.tracking_url && (
                <a 
                  href={selectedOrder.tracking_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-purple-600 hover:text-purple-800 font-medium"
                >
                  {t('orders.trackShipment', 'Track your shipment')} <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* Shipping Address */}
          <div className="mb-6 p-4 bg-[#FAF7F2] rounded-lg border border-[#E6DFD6]">
            <h3 className="font-medium text-[#1C1C1C] mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> {t('orders.shippingAddress', 'Shipping Address')}
            </h3>
            <p className="text-[#4A4A4A] font-body">
              {selectedOrder.shipping_address?.full_name || selectedOrder.shipping_address?.name}<br />
              {selectedOrder.shipping_address?.street}<br />
              {selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.postal_code}<br />
              {selectedOrder.shipping_address?.country}
            </p>
            {selectedOrder.shipping_address?.phone && (
              <p className="text-[#7A7A7A] text-sm mt-1">Tel: {selectedOrder.shipping_address.phone}</p>
            )}
          </div>

          {/* Order Items */}
          <h3 className="font-medium text-[#1C1C1C] mb-4 flex items-center gap-2">
            <Package className="w-4 h-4" /> {t('orders.orderItems', 'Order Items')}
          </h3>
          <div className="space-y-3 mb-6">
            {selectedOrder.line_items?.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-[#FAF7F2] rounded-lg border border-[#E6DFD6]">
                <div className="flex items-center gap-4">
                  {item.image && (
                    <img src={item.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  )}
                  <div>
                    <p className="font-medium text-[#1C1C1C]">{item.name || item.product_name}</p>
                    <p className="text-sm text-[#7A7A7A]">{t('orders.quantity', 'Qty')}: {item.quantity}</p>
                  </div>
                </div>
                <p className="font-medium text-[#1C1C1C]">€{item.amount?.toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-[#E6DFD6] flex justify-between items-center">
            <span className="font-medium text-[#1C1C1C]">{t('common.total', 'Total')}</span>
            <span className="font-bold text-2xl text-[#1C1C1C]">€{selectedOrder.total_amount?.toFixed(2)}</span>
          </div>

          {/* Status History */}
          {selectedOrder.status_history?.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[#E6DFD6]">
              <h3 className="font-medium text-[#1C1C1C] mb-4">{t('orders.statusHistory', 'Status History')}</h3>
              <div className="space-y-3">
                {selectedOrder.status_history.slice().reverse().map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm">
                    <div className={`w-2 h-2 rounded-full mt-2 ${statusColors[entry.status]?.split(' ')[0] || 'bg-gray-300'}`} />
                    <div>
                      <p className="font-medium text-[#1C1C1C] capitalize">
                        {t(`orders.status.${entry.status}`, entry.status)}
                      </p>
                      <p className="text-[#7A7A7A]">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                      {entry.notes && <p className="text-[#4A4A4A] mt-1">{entry.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List View
  return (
    <div>
      <h1 className="font-heading text-3xl font-semibold text-[#1C1C1C] mb-2">
        {t('orders.title', 'My Orders')}
      </h1>
      <p className="text-[#7A7A7A] font-body mb-6">{t('orders.description', 'View and track your orders.')}</p>

      <div className="bg-white rounded-xl border border-[#DED7CE] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#7A7A7A]">{t('common.loading', 'Loading...')}</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingBag className="w-12 h-12 text-[#DED7CE] mx-auto mb-4" />
            <p className="text-[#7A7A7A] mb-4">{t('orders.noOrders', "You haven't placed any orders yet.")}</p>
            <a href="/products" className="text-[#1C1C1C] hover:underline font-medium">
              {t('orders.startShopping', 'Start Shopping')} →
            </a>
          </div>
        ) : (
          <div className="divide-y divide-stone-100" data-testid="orders-list">
            {orders.map((order) => {
              const StatusIcon = statusIcons[order.status] || Clock;
              const statusColor = statusColors[order.status] || 'bg-gray-100 text-gray-600';
              return (
                <button
                  key={order.order_id}
                  onClick={() => setSelectedOrder(order)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-stone-50 transition-colors text-left"
                  data-testid={`order-row-${order.order_id}`}
                >
                  {/* Status icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${statusColor}`}>
                    <StatusIcon className="w-5 h-5" />
                  </div>
                  
                  {/* Order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#1C1C1C]">€{order.total_amount?.toFixed(2)}</span>
                      <span className="text-xs text-text-muted">·</span>
                      <span className="text-xs text-text-muted">{order.line_items?.length || 0} items</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-medium capitalize ${statusColor.includes('green') ? 'text-green-600' : statusColor.includes('blue') ? 'text-blue-600' : statusColor.includes('purple') ? 'text-purple-600' : statusColor.includes('red') ? 'text-red-600' : 'text-amber-600'}`}>
                        {t(`orders.status.${order.status}`, order.status)}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {new Date(order.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Reorder button for completed orders */}
                  {['delivered', 'completed'].includes(order.status) && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await axios.post(`${API}/customer/orders/${order.order_id}/reorder`, {}, { withCredentials: true });
                          toast.success('Productos agregados al carrito');
                        } catch { toast.error('Error al reordenar'); }
                      }}
                      className="shrink-0 bg-[#2D5A27] text-white text-xs font-medium px-3 py-1.5 rounded-full hover:bg-[#1F4A1A] transition-colors"
                      data-testid={`reorder-${order.order_id}`}
                    >
                      Repetir
                    </button>
                  )}
                  
                  {/* Arrow */}
                  <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
