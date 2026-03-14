import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import {
  ArrowLeft, XCircle, Truck, Check, Clock, Package,
  MapPin, ExternalLink, RotateCcw, Star, MessageSquare
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { asNumber } from '../../utils/safe';
import ReviewModal from '../../components/ReviewModal';
import { getStatusLabel, getStatusColor, getStatusIcon } from '../../components/OrderStatusBadge';

const statusIcons = {
  pending: Clock,
  confirmed: Check,
  preparing: Package,
  shipped: Truck,
  delivered: Check,
  cancelled: XCircle,
};

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const data = await apiClient.get(`/customer/orders/${orderId}`);
      setOrder(data);
    } catch {
      toast.error('Error al cargar el pedido');
      navigate('/dashboard/orders');
    } finally {
      setLoading(false);
    }
  }, [orderId, navigate]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const cancelOrder = async () => {
    if (!window.confirm('¿Estás seguro de que quieres cancelar este pedido?')) return;
    try {
      await apiClient.put(`/customer/orders/${orderId}/cancel`, {});
      toast.success('Pedido cancelado');
      fetchOrder();
    } catch (error) {
      toast.error(error.message || 'No se puede cancelar este pedido');
    }
  };

  const reorder = async () => {
    try {
      await apiClient.post(`/customer/orders/${orderId}/reorder`, {});
      toast.success('Productos agregados al carrito');
    } catch {
      toast.error('Error al reordenar');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) return null;

  const canCancel = ['pending', 'confirmed'].includes(order.status);
  const isDelivered = ['delivered', 'completed'].includes(order.status);
  const currentStep = STATUS_FLOW.indexOf(order.status);
  const StatusIcon = statusIcons[order.status] || Clock;

  return (
    <div>
      <button
        onClick={() => navigate('/dashboard/orders')}
        className="flex items-center gap-2 text-stone-500 hover:text-stone-950 mb-4 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a pedidos
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-stone-950">
              Pedido #{String(order.order_id).slice(-8)}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {new Date(order.created_at).toLocaleDateString('es-ES', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon className="w-4 h-4" />
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </span>
          </div>
        </div>

        {/* Timeline */}
        {order.status !== 'cancelled' && order.status !== 'refunded' && currentStep >= 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-4 left-0 right-0 h-1 bg-stone-100 rounded">
                <div
                  className="h-full bg-stone-950 rounded transition-all duration-500"
                  style={{ width: `${(currentStep / (STATUS_FLOW.length - 1)) * 100}%` }}
                />
              </div>
              {STATUS_FLOW.map((status, index) => {
                const StepIcon = statusIcons[status];
                const isCompleted = index <= currentStep;
                const isCurrent = index === currentStep;
                return (
                  <div key={status} className="flex flex-col items-center relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-400'
                    } ${isCurrent ? 'ring-4 ring-stone-200' : ''}`}>
                      <StepIcon className="w-4 h-4" />
                    </div>
                    <span className={`mt-2 text-[10px] font-medium ${
                      isCompleted ? 'text-stone-700' : 'text-stone-400'
                    }`}>
                      {getStatusLabel(status)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tracking */}
      {order.tracking_number && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4">
          <h3 className="text-sm font-semibold text-stone-950 mb-2 flex items-center gap-2">
            <Truck className="w-4 h-4" /> Seguimiento
          </h3>
          <p className="text-sm text-stone-700 font-mono">{order.tracking_number}</p>
          {order.tracking_url && (
            <a
              href={order.tracking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-sm text-stone-600 hover:text-stone-950 font-medium"
            >
              Rastrear envío <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4">
        <h3 className="text-sm font-semibold text-stone-950 mb-3 flex items-center gap-2">
          <Package className="w-4 h-4" /> Productos
        </h3>
        <div className="space-y-3">
          {order.line_items?.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              {item.image ? (
                <img src={item.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-stone-100 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-950 truncate">{item.name || item.product_name}</p>
                <p className="text-xs text-stone-500">x{item.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-stone-950 shrink-0">
                {asNumber(item.amount || item.price * item.quantity).toFixed(2)}€
              </p>
            </div>
          ))}
        </div>

        {/* Price breakdown */}
        <div className="mt-4 pt-3 border-t border-stone-100 space-y-1.5">
          {order.subtotal != null && (
            <div className="flex justify-between text-sm text-stone-600">
              <span>Subtotal</span>
              <span>{asNumber(order.subtotal).toFixed(2)}€</span>
            </div>
          )}
          {order.shipping_cost != null && order.shipping_cost > 0 && (
            <div className="flex justify-between text-sm text-stone-600">
              <span>Envío</span>
              <span>{asNumber(order.shipping_cost).toFixed(2)}€</span>
            </div>
          )}
          {order.discount_amount != null && order.discount_amount > 0 && (
            <div className="flex justify-between text-sm text-stone-600">
              <span>Descuento</span>
              <span>-{asNumber(order.discount_amount).toFixed(2)}€</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-stone-950 pt-1">
            <span>Total</span>
            <span>{asNumber(order.total_amount).toFixed(2)}€</span>
          </div>
        </div>
      </div>

      {/* Shipping address */}
      {order.shipping_address && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4">
          <h3 className="text-sm font-semibold text-stone-950 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Dirección de envío
          </h3>
          <p className="text-sm text-stone-600 leading-relaxed">
            {order.shipping_address.full_name || order.shipping_address.name}<br />
            {order.shipping_address.street}<br />
            {order.shipping_address.city}, {order.shipping_address.postal_code}<br />
            {order.shipping_address.country}
          </p>
          {order.shipping_address.phone && (
            <p className="text-xs text-stone-500 mt-1">Tel: {order.shipping_address.phone}</p>
          )}
        </div>
      )}

      {/* Status history */}
      {order.status_history?.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4">
          <h3 className="text-sm font-semibold text-stone-950 mb-3">Historial</h3>
          <div className="space-y-3">
            {order.status_history.slice().reverse().map((entry, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full mt-1.5 bg-stone-300 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-stone-950 capitalize">
                    {getStatusLabel(entry.status)}
                  </p>
                  <p className="text-xs text-stone-500">
                    {new Date(entry.timestamp).toLocaleString('es-ES')}
                  </p>
                  {entry.notes && <p className="text-xs text-stone-600 mt-0.5">{entry.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-4">
        {canCancel && (
          <button
            onClick={cancelOrder}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Cancelar pedido
          </button>
        )}
        {isDelivered && (
          <>
            <button
              onClick={reorder}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-950 text-white text-sm font-medium hover:bg-stone-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Repetir pedido
            </button>
            <button
              onClick={() => setReviewOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-stone-200 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <Star className="w-4 h-4" />
              Valorar
            </button>
          </>
        )}
      </div>

      <ReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} order={order} />
    </div>
  );
}
